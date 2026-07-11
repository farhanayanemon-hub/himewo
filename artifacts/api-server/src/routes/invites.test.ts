import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  pagesTable,
  pageFollowersTable,
  pageInvitesTable,
  groupsTable,
  groupMembersTable,
  groupInvitesTable,
  friendshipsTable,
  notificationsTable,
} from "@workspace/db";
import { and, eq, inArray, or } from "drizzle-orm";
import app from "../app";

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Locks in page + group invites:
// - page followers/following list endpoints
// - inviting friends to a page / group creates invite rows + notifications
// - an invited user can join a PRIVATE group immediately (bypass approval),
//   and the invite row is consumed on join
// - declining a group invite removes the invite row

const owner = randomUUID();
const friendA = randomUUID();
const friendB = randomUUID();
const stranger = randomUUID();
const slug = owner.slice(0, 8);

let pageId: number;
let privateGroupId: number;

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
    { id: owner, username: `inv-owner-${slug}`, displayName: "Invite Owner" },
    { id: friendA, username: `inv-a-${slug}`, displayName: "Friend A" },
    { id: friendB, username: `inv-b-${slug}`, displayName: "Friend B" },
    { id: stranger, username: `inv-x-${slug}`, displayName: "Stranger" },
  ]);
  // owner is friends with friendA and friendB, but NOT stranger.
  {
    const [a1, b1] = pair(owner, friendA);
    const [a2, b2] = pair(owner, friendB);
    await db.insert(friendshipsTable).values([
      { userAId: a1, userBId: b1 },
      { userAId: a2, userBId: b2 },
    ]);
  }

  const [page] = await db
    .insert(pagesTable)
    .values({ name: `Invite Page ${slug}`, createdBy: owner })
    .returning();
  pageId = page.id;
  // friendA already follows the page → should be skipped by invite.
  await db
    .insert(pageFollowersTable)
    .values({ pageId, userId: friendA });

  const [group] = await db
    .insert(groupsTable)
    .values({ name: `Invite Group ${slug}`, privacy: "private", createdBy: owner })
    .returning();
  privateGroupId = group.id;
  await db.insert(groupMembersTable).values({
    groupId: privateGroupId,
    userId: owner,
    role: "admin",
    status: "active",
  });

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await db.delete(pageInvitesTable).where(eq(pageInvitesTable.pageId, pageId));
  await db
    .delete(groupInvitesTable)
    .where(eq(groupInvitesTable.groupId, privateGroupId));
  await db
    .delete(notificationsTable)
    .where(
      inArray(notificationsTable.userId, [owner, friendA, friendB, stranger]),
    );
  await db.delete(pagesTable).where(eq(pagesTable.id, pageId));
  await db.delete(groupsTable).where(eq(groupsTable.id, privateGroupId));
  {
    const [a1, b1] = pair(owner, friendA);
    const [a2, b2] = pair(owner, friendB);
    await db
      .delete(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.userAId, a1),
            eq(friendshipsTable.userBId, b1),
          ),
          and(
            eq(friendshipsTable.userAId, a2),
            eq(friendshipsTable.userBId, b2),
          ),
        ),
      );
  }
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [owner, friendA, friendB, stranger]));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});

describe("page invites + followers/following", () => {
  it("lists page followers", async () => {
    const r = await api(`/pages/${pageId}/followers`, owner);
    expect(r.status).toBe(200);
    expect(r.body.map((p: any) => p.id)).toContain(friendA);
  });

  it("lists page following (empty)", async () => {
    const r = await api(`/pages/${pageId}/following`, owner);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it("invites friends, skipping existing followers + non-friends, and notifies", async () => {
    const r = await api(`/pages/${pageId}/invite`, owner, {
      method: "POST",
      body: JSON.stringify({ userIds: [friendA, friendB, stranger] }),
    });
    expect(r.status).toBe(204);

    const invites = await db
      .select()
      .from(pageInvitesTable)
      .where(eq(pageInvitesTable.pageId, pageId));
    // friendA already follows → skipped; stranger is not a friend → skipped;
    // only friendB invited.
    expect(invites.map((i) => i.inviteeId)).toEqual([friendB]);

    const notif = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, friendB),
          eq(notificationsTable.type, "page_invite"),
        ),
      );
    expect(notif.length).toBe(1);
  });
});

describe("group invites", () => {
  it("owner invites a friend to the private group", async () => {
    const r = await api(`/groups/${privateGroupId}/invite`, owner, {
      method: "POST",
      body: JSON.stringify({ userIds: [friendA] }),
    });
    expect(r.status).toBe(204);
    const invites = await db
      .select()
      .from(groupInvitesTable)
      .where(eq(groupInvitesTable.groupId, privateGroupId));
    expect(invites.map((i) => i.inviteeId)).toContain(friendA);
  });

  it("invited user sees the invite in their invite list", async () => {
    const r = await api(`/groups/invites`, friendA);
    expect(r.status).toBe(200);
    expect(r.body.map((g: any) => g.id)).toContain(privateGroupId);
  });

  it("invited user joins private group immediately (active, invite consumed)", async () => {
    const r = await api(`/groups/${privateGroupId}/join`, friendA, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(204);
    const [m] = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, privateGroupId),
          eq(groupMembersTable.userId, friendA),
        ),
      );
    expect(m.status).toBe("active");
    const leftover = await db
      .select()
      .from(groupInvitesTable)
      .where(
        and(
          eq(groupInvitesTable.groupId, privateGroupId),
          eq(groupInvitesTable.inviteeId, friendA),
        ),
      );
    expect(leftover.length).toBe(0);
  });

  it("declining a group invite removes it", async () => {
    await api(`/groups/${privateGroupId}/invite`, owner, {
      method: "POST",
      body: JSON.stringify({ userIds: [friendB] }),
    });
    const r = await api(`/groups/${privateGroupId}/invite/decline`, friendB, {
      method: "POST",
    });
    expect(r.status).toBe(204);
    const leftover = await db
      .select()
      .from(groupInvitesTable)
      .where(
        and(
          eq(groupInvitesTable.groupId, privateGroupId),
          eq(groupInvitesTable.inviteeId, friendB),
        ),
      );
    expect(leftover.length).toBe(0);
  });
});
