import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { db, pool, profilesTable, postsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";

// Locks in the per-post audience editing rules (Task #23): after publishing,
// only the post's author can change its audience (public / friends / only me),
// the change persists through PATCH /posts/:id, and the updated audience is
// reflected on subsequent reads. Without these a refactor of the update route
// could silently drop the ownership guard or stop honoring `privacy`.

const author = randomUUID();
const stranger = randomUUID();
const slug = author.slice(0, 8);

let postId: number;

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
    {
      id: author,
      username: `aud-author-${slug}`,
      displayName: "Audience Author",
    },
    {
      id: stranger,
      username: `aud-stranger-${slug}`,
      displayName: "Audience Stranger",
    },
  ]);

  const [post] = await db
    .insert(postsTable)
    .values({ authorId: author, content: "audience post", privacy: "public" })
    .returning();
  postId = post.id;

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  // Deleting the profiles cascades to their posts.
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [author, stranger]));
  await pool.end();
});

describe("PATCH /posts/:id audience editing", () => {
  it("lets the author widen/narrow the audience and persists it", async () => {
    const friends = await api(`/posts/${postId}`, author, {
      method: "PATCH",
      body: JSON.stringify({ privacy: "friends" }),
    });
    expect(friends.status).toBe(200);
    expect(friends.body.privacy).toBe("friends");

    const onlyMe = await api(`/posts/${postId}`, author, {
      method: "PATCH",
      body: JSON.stringify({ privacy: "private" }),
    });
    expect(onlyMe.status).toBe(200);
    expect(onlyMe.body.privacy).toBe("private");

    // The change is durable in the database, not just the response payload.
    const [row] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, postId));
    expect(row.privacy).toBe("private");
  });

  it("forbids a non-author from changing the audience", async () => {
    // First put the post back to public as the author.
    await api(`/posts/${postId}`, author, {
      method: "PATCH",
      body: JSON.stringify({ privacy: "public" }),
    });

    const { status } = await api(`/posts/${postId}`, stranger, {
      method: "PATCH",
      body: JSON.stringify({ privacy: "private" }),
    });
    expect(status).toBe(403);

    // The stranger's attempt left the audience untouched.
    const [row] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, postId));
    expect(row.privacy).toBe("public");
  });

  it("rejects an invalid audience value", async () => {
    const { status } = await api(`/posts/${postId}`, author, {
      method: "PATCH",
      body: JSON.stringify({ privacy: "everyone" }),
    });
    expect(status).toBe(400);
  });
});
