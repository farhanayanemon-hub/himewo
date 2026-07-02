import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  postsTable,
  commentsTable,
  notificationsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import app from "../app";

// Locks in comment threading + @mentions:
// - a reply's parent must exist and belong to the same post (else 400)
// - threads are one level deep: replying to a reply flattens to the top-level
//   parent (Facebook style)
// - mention tokens @[Name](user:<uuid>) in the content create "mention"
//   notifications for real users only, never for the commenter themself.

const author = randomUUID();
const commenter = randomUUID();
const mentioned = randomUUID();
const slug = author.slice(0, 8);

let postId: number;
let otherPostId: number;

let server: Server;
let baseUrl: string;

async function api(
  path: string,
  asUser: string,
  init: RequestInit = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer dev:${asUser}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

beforeAll(async () => {
  await db.insert(profilesTable).values([
    { id: author, username: `cm-author-${slug}`, displayName: "Comment Author" },
    {
      id: commenter,
      username: `cm-replier-${slug}`,
      displayName: "Comment Replier",
    },
    {
      id: mentioned,
      username: `cm-mention-${slug}`,
      displayName: "Mentioned User",
    },
  ]);

  const [post] = await db
    .insert(postsTable)
    .values({ authorId: author, content: "thread post", privacy: "public" })
    .returning();
  postId = post.id;

  const [other] = await db
    .insert(postsTable)
    .values({ authorId: author, content: "other post", privacy: "public" })
    .returning();
  otherPostId = other.id;

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [author, commenter, mentioned]));
  await pool.end();
});

describe("comment replies", () => {
  let topId: number;
  let replyId: number;

  it("creates a top-level comment and a reply attached to it", async () => {
    const top = await api(`/posts/${postId}/comments`, author, {
      method: "POST",
      body: JSON.stringify({ content: "top level" }),
    });
    expect(top.status).toBe(201);
    expect(top.body.parentId ?? null).toBeNull();
    topId = top.body.id;

    const reply = await api(`/posts/${postId}/comments`, commenter, {
      method: "POST",
      body: JSON.stringify({ content: "a reply", parentId: topId }),
    });
    expect(reply.status).toBe(201);
    expect(reply.body.parentId).toBe(topId);
    replyId = reply.body.id;
  });

  it("flattens a reply-to-a-reply onto the top-level parent", async () => {
    const nested = await api(`/posts/${postId}/comments`, author, {
      method: "POST",
      body: JSON.stringify({ content: "nested reply", parentId: replyId }),
    });
    expect(nested.status).toBe(201);
    expect(nested.body.parentId).toBe(topId);
  });

  it("rejects a parent from a different post and a nonexistent parent", async () => {
    const crossPost = await api(`/posts/${otherPostId}/comments`, commenter, {
      method: "POST",
      body: JSON.stringify({ content: "bad parent", parentId: topId }),
    });
    expect(crossPost.status).toBe(400);

    const missing = await api(`/posts/${postId}/comments`, commenter, {
      method: "POST",
      body: JSON.stringify({ content: "ghost parent", parentId: 999999999 }),
    });
    expect(missing.status).toBe(400);
  });
});

describe("comment mentions", () => {
  it("notifies a mentioned user exactly once, skipping self-mentions and fake ids", async () => {
    const content = [
      `hey @[Mentioned User](user:${mentioned})`,
      `and me @[Comment Replier](user:${commenter})`,
      `and dupe @[Mentioned User](user:${mentioned})`,
      "and junk @[Nobody](user:not-a-uuid)",
      `and ghost @[Ghost](user:${randomUUID()})`,
    ].join(" ");

    const res = await api(`/posts/${postId}/comments`, commenter, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    expect(res.status).toBe(201);

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, mentioned),
          eq(notificationsTable.type, "mention"),
          eq(notificationsTable.actorId, commenter),
        ),
      );
    expect(rows.length).toBe(1);

    // The commenter never gets a mention notification for their own comment.
    const selfRows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, commenter),
          eq(notificationsTable.type, "mention"),
        ),
      );
    expect(selfRows.length).toBe(0);
  });
});
