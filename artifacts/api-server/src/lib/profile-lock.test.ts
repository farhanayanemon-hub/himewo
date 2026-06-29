import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  postsTable,
  postReactionsTable,
  commentsTable,
  reelsTable,
  storiesTable,
  friendshipsTable,
  savedItemsTable,
  userSettingsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";
import {
  toProfile,
  buildListProfiles,
  buildProfileDetail,
  buildPosts,
  buildReels,
  buildStoryGroups,
} from "./serialize";

// Locks in the Facebook-style profile-lock privacy rules (Task #3): a locked
// user's posts, intro/bio and friends must stay hidden from non-friends across
// every read path, while the owner and their friends keep full access. Without
// these tests a future refactor of serialize/authz/routes could silently
// re-open a leak.

// Three actors: a locked owner, a friend of the owner, and an unrelated
// stranger (non-friend, non-owner).
const owner = randomUUID();
const friend = randomUUID();
const stranger = randomUUID();

const slug = owner.slice(0, 8);
const ownerUsername = `lock-owner-${slug}`;

// Intro/bio fields that must never leak through embedded-profile payloads.
const OWNER_BIO = "secret bio that should stay hidden";
const OWNER_LOCATION = "Dhaka";
const OWNER_WORK = "Secret Corp";

let ownerPublicPostId: number;
let ownerFriendsPostId: number;
let friendPublicPostId: number;
let ownerPublicCommentId: number;
let ownerReelId: number;
let ownerStoryId: number;

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
      id: owner,
      username: ownerUsername,
      displayName: "Lock Owner",
      email: "owner@example.com",
      bio: OWNER_BIO,
      birthday: "1990-05-01",
      location: OWNER_LOCATION,
      work: OWNER_WORK,
      education: "Secret University",
      hometown: "Secret Town",
    },
    {
      id: friend,
      username: `lock-friend-${slug}`,
      displayName: "Lock Friend",
    },
    {
      id: stranger,
      username: `lock-stranger-${slug}`,
      displayName: "Lock Stranger",
    },
  ]);

  // Owner <-> friend friendship (stored with userAId < userBId).
  const [a, b] = owner < friend ? [owner, friend] : [friend, owner];
  await db.insert(friendshipsTable).values({ userAId: a, userBId: b });

  // Lock the owner's profile.
  await db
    .insert(userSettingsTable)
    .values({ userId: owner, isLocked: true });

  const inserted = await db
    .insert(postsTable)
    .values([
      { authorId: owner, content: "owner public post", privacy: "public" },
      { authorId: owner, content: "owner friends post", privacy: "friends" },
      { authorId: friend, content: "friend public post", privacy: "public" },
    ])
    .returning();
  ownerPublicPostId = inserted.find((p) => p.content === "owner public post")!.id;
  ownerFriendsPostId = inserted.find((p) => p.content === "owner friends post")!.id;
  friendPublicPostId = inserted.find((p) => p.content === "friend public post")!.id;

  // A comment by the owner on their own (locked) public post — used to assert
  // canViewComment also denies non-friends.
  const [ownerComment] = await db
    .insert(commentsTable)
    .values({
      postId: ownerPublicPostId,
      authorId: owner,
      content: "owner comment on locked post",
    })
    .returning();
  ownerPublicCommentId = ownerComment.id;

  const [reel] = await db
    .insert(reelsTable)
    .values({ authorId: owner, videoUrl: "https://example.com/r.mp4" })
    .returning();
  ownerReelId = reel.id;

  const [story] = await db
    .insert(storiesTable)
    .values({
      authorId: owner,
      mediaUrl: "https://example.com/s.jpg",
      mediaType: "image",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning();
  ownerStoryId = story.id;

  // Owner reacts on the friend's public post (visible to everyone) so we can
  // assert the reactions list does not leak the owner's intro.
  await db
    .insert(postReactionsTable)
    .values({ postId: friendPublicPostId, userId: owner, type: "like" });

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  // Deleting the profiles cascades to settings, posts, reels, stories,
  // friendships, reactions and saved_items.
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [owner, friend, stranger]));
  await pool.end();
});

describe("locked profile: timeline posts hidden from non-friends", () => {
  it("hides the locked owner's public post from a non-friend in /feed", async () => {
    const { status, body } = await api("/feed", stranger);
    expect(status).toBe(200);
    const ids = body.map((p: any) => p.id);
    expect(ids).not.toContain(ownerPublicPostId);
    expect(ids).not.toContain(ownerFriendsPostId);
  });

  it("shows the locked owner's posts to a friend in /feed", async () => {
    const { status, body } = await api("/feed", friend);
    expect(status).toBe(200);
    const ids = body.map((p: any) => p.id);
    expect(ids).toContain(ownerPublicPostId);
    expect(ids).toContain(ownerFriendsPostId);
  });

  it("returns an empty timeline to a non-friend on /users/:id/posts", async () => {
    const { status, body } = await api(`/users/${owner}/posts`, stranger);
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns public + friends posts to a friend on /users/:id/posts", async () => {
    const { status, body } = await api(`/users/${owner}/posts`, friend);
    expect(status).toBe(200);
    const ids = body.map((p: any) => p.id);
    expect(ids).toContain(ownerPublicPostId);
    expect(ids).toContain(ownerFriendsPostId);
  });

  it("returns all posts to the owner on /users/:id/posts", async () => {
    const { status, body } = await api(`/users/${owner}/posts`, owner);
    expect(status).toBe(200);
    const ids = body.map((p: any) => p.id);
    expect(ids).toContain(ownerPublicPostId);
    expect(ids).toContain(ownerFriendsPostId);
  });
});

describe("locked profile: intro/bio absent from embedded-profile payloads", () => {
  it("toProfile never includes intro for embedded profiles", async () => {
    const [row] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, owner));
    const p = toProfile(row);
    expect(p.bio).toBeNull();
    expect(p.location).toBeNull();
    expect(p.work).toBeNull();
    expect(p.email).toBeNull();
  });

  it("buildListProfiles (search/friends lists) omits intro and flags isLocked", async () => {
    const [row] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, owner));
    const [p] = await buildListProfiles([row]);
    expect(p.bio).toBeNull();
    expect(p.location).toBeNull();
    expect(p.isLocked).toBe(true);
  });

  it("does not leak intro through the /users search results", async () => {
    const { status, body } = await api(
      `/users?q=${encodeURIComponent(ownerUsername)}`,
      stranger,
    );
    expect(status).toBe(200);
    const found = body.find((u: any) => u.id === owner);
    expect(found).toBeDefined();
    expect(found.bio).toBeNull();
    expect(found.isLocked).toBe(true);
  });

  it("does not leak intro through a friends list that contains the locked user", async () => {
    // The friend is not locked, so the stranger can read the friend's friends
    // list — which embeds the locked owner. The owner's intro must be absent.
    const { status, body } = await api(`/users/${friend}/friends`, stranger);
    expect(status).toBe(200);
    const found = body.find((u: any) => u.id === owner);
    expect(found).toBeDefined();
    expect(found.bio).toBeNull();
    expect(found.location).toBeNull();
  });

  it("does not leak intro through a post-reactions list", async () => {
    const { status, body } = await api(
      `/posts/${friendPublicPostId}/reactions`,
      stranger,
    );
    expect(status).toBe(200);
    const reactor = body.find((r: any) => r.user.id === owner);
    expect(reactor).toBeDefined();
    expect(reactor.user.bio).toBeNull();
    expect(reactor.user.location).toBeNull();
  });

  it("does not leak intro through reel authors", async () => {
    const [row] = await db
      .select()
      .from(reelsTable)
      .where(eq(reelsTable.id, ownerReelId));
    const [reel] = await buildReels([row], stranger);
    expect(reel.author.id).toBe(owner);
    expect(reel.author.bio).toBeNull();
  });

  it("does not leak intro through post authors", async () => {
    const [row] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, ownerPublicPostId));
    const [post] = await buildPosts([row], stranger);
    expect(post.author.id).toBe(owner);
    expect(post.author.bio).toBeNull();
  });

  it("does not leak intro through story authors", async () => {
    const groups = await buildStoryGroups(stranger);
    const ownerGroup = groups.find((g) => g.author.id === owner);
    expect(ownerGroup).toBeDefined();
    expect(ownerGroup!.author.bio).toBeNull();
    expect(ownerGroup!.stories.some((s) => s.id === ownerStoryId)).toBe(true);
  });
});

describe("locked profile: full-profile intro respects viewer relationship", () => {
  it("hides intro from a non-friend on the full profile page", async () => {
    const detail = await buildProfileDetail(owner, stranger);
    expect(detail).not.toBeNull();
    expect(detail!.bio).toBeNull();
    expect(detail!.location).toBeNull();
    expect(detail!.isLocked).toBe(true);
    expect(detail!.viewerIsFriend).toBe(false);
  });

  it("shows intro to a friend on the full profile page", async () => {
    const detail = await buildProfileDetail(owner, friend);
    expect(detail!.bio).toBe(OWNER_BIO);
    expect(detail!.location).toBe(OWNER_LOCATION);
    // isLocked is viewer-relative for non-owners: a friend is NOT restricted
    // (they see the full intro), so the locked-card state does not apply.
    expect(detail!.isLocked).toBe(false);
    expect(detail!.viewerIsFriend).toBe(true);
  });

  it("shows intro and contact to the owner on their own profile page", async () => {
    const detail = await buildProfileDetail(owner, owner);
    expect(detail!.bio).toBe(OWNER_BIO);
    expect(detail!.work).toBe(OWNER_WORK);
    expect(detail!.email).toBe("owner@example.com");
  });
});

describe("locked profile: interaction routes denied to non-friends", () => {
  // Each of these write/read routes gates on canViewPost (in the route, not in
  // serialize), so a non-friend must get 404 on the locked owner's public post,
  // while the owner and their friend keep access.

  it("blocks a non-friend from reacting (PUT /posts/:id/reaction)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/reaction`,
      stranger,
      { method: "PUT", body: JSON.stringify({ type: "like" }) },
    );
    expect(status).toBe(404);
  });

  it("lets a friend react (PUT /posts/:id/reaction)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/reaction`,
      friend,
      { method: "PUT", body: JSON.stringify({ type: "like" }) },
    );
    expect(status).toBe(200);
  });

  it("lets the owner react (PUT /posts/:id/reaction)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/reaction`,
      owner,
      { method: "PUT", body: JSON.stringify({ type: "love" }) },
    );
    expect(status).toBe(200);
  });

  it("blocks a non-friend from commenting (POST /posts/:id/comments)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/comments`,
      stranger,
      { method: "POST", body: JSON.stringify({ content: "hi stranger" }) },
    );
    expect(status).toBe(404);
  });

  it("lets a friend comment (POST /posts/:id/comments)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/comments`,
      friend,
      { method: "POST", body: JSON.stringify({ content: "hi friend" }) },
    );
    expect(status).toBe(201);
  });

  it("lets the owner comment (POST /posts/:id/comments)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/comments`,
      owner,
      { method: "POST", body: JSON.stringify({ content: "hi self" }) },
    );
    expect(status).toBe(201);
  });

  it("blocks a non-friend from listing comments (GET /posts/:id/comments)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/comments`,
      stranger,
    );
    expect(status).toBe(404);
  });

  it("lets a friend list comments (GET /posts/:id/comments)", async () => {
    const { status } = await api(`/posts/${ownerPublicPostId}/comments`, friend);
    expect(status).toBe(200);
  });

  it("lets the owner list comments (GET /posts/:id/comments)", async () => {
    const { status } = await api(`/posts/${ownerPublicPostId}/comments`, owner);
    expect(status).toBe(200);
  });

  it("blocks a non-friend from listing reactions (GET /posts/:id/reactions)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/reactions`,
      stranger,
    );
    expect(status).toBe(404);
  });

  it("lets a friend list reactions (GET /posts/:id/reactions)", async () => {
    const { status } = await api(
      `/posts/${ownerPublicPostId}/reactions`,
      friend,
    );
    expect(status).toBe(200);
  });

  it("lets the owner list reactions (GET /posts/:id/reactions)", async () => {
    const { status } = await api(`/posts/${ownerPublicPostId}/reactions`, owner);
    expect(status).toBe(200);
  });

  it("blocks a non-friend from sharing (POST /posts/:id/share)", async () => {
    const { status } = await api(`/posts/${ownerPublicPostId}/share`, stranger, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(status).toBe(404);
  });

  it("lets a friend share (POST /posts/:id/share)", async () => {
    const { status } = await api(`/posts/${ownerPublicPostId}/share`, friend, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(status).toBe(201);
  });

  it("lets the owner share (POST /posts/:id/share)", async () => {
    const { status } = await api(`/posts/${ownerPublicPostId}/share`, owner, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(status).toBe(201);
  });

  it("blocks a non-friend from fetching the post (GET /posts/:id)", async () => {
    const { status } = await api(`/posts/${ownerPublicPostId}`, stranger);
    expect(status).toBe(404);
  });

  it("lets a friend fetch the post (GET /posts/:id)", async () => {
    const { status, body } = await api(`/posts/${ownerPublicPostId}`, friend);
    expect(status).toBe(200);
    expect(body.id).toBe(ownerPublicPostId);
  });

  it("lets the owner fetch the post (GET /posts/:id)", async () => {
    const { status, body } = await api(`/posts/${ownerPublicPostId}`, owner);
    expect(status).toBe(200);
    expect(body.id).toBe(ownerPublicPostId);
  });

  it("blocks a non-friend from reacting to a comment on a locked post (canViewComment)", async () => {
    const { status } = await api(
      `/comments/${ownerPublicCommentId}/reaction`,
      stranger,
      { method: "PUT", body: JSON.stringify({ type: "like" }) },
    );
    expect(status).toBe(404);
  });

  it("lets a friend react to a comment on a locked post (canViewComment)", async () => {
    const { status } = await api(
      `/comments/${ownerPublicCommentId}/reaction`,
      friend,
      { method: "PUT", body: JSON.stringify({ type: "like" }) },
    );
    expect(status).toBe(200);
  });

  it("lets the owner react to a comment on a locked post (canViewComment)", async () => {
    const { status } = await api(
      `/comments/${ownerPublicCommentId}/reaction`,
      owner,
      { method: "PUT", body: JSON.stringify({ type: "love" }) },
    );
    expect(status).toBe(200);
  });
});

describe("locked profile: saved-item privacy", () => {
  it("rejects saving a post the viewer can no longer see (POST /saved)", async () => {
    const { status } = await api("/saved", stranger, {
      method: "POST",
      body: JSON.stringify({ entityType: "post", entityId: ownerPublicPostId }),
    });
    expect(status).toBe(404);
  });

  it("drops a stale saved post after its author locks (GET /saved)", async () => {
    // Simulate a row saved before the owner locked their profile by inserting
    // it directly, bypassing the POST guard.
    await db.insert(savedItemsTable).values({
      userId: stranger,
      entityType: "post",
      entityId: ownerPublicPostId,
    });
    const { status, body } = await api("/saved", stranger);
    expect(status).toBe(200);
    const savedPostIds = body
      .filter((i: any) => i.entityType === "post")
      .map((i: any) => i.entityId);
    expect(savedPostIds).not.toContain(ownerPublicPostId);
  });

  it("keeps a saved post visible for a friend of the locked author", async () => {
    await db.insert(savedItemsTable).values({
      userId: friend,
      entityType: "post",
      entityId: ownerFriendsPostId,
    });
    const { status, body } = await api("/saved", friend);
    expect(status).toBe(200);
    const item = body.find(
      (i: any) => i.entityType === "post" && i.entityId === ownerFriendsPostId,
    );
    expect(item).toBeDefined();
    expect(item.post?.id).toBe(ownerFriendsPostId);
  });
});
