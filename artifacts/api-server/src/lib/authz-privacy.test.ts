import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  pool,
  profilesTable,
  friendshipsTable,
  userSettingsTable,
} from "@workspace/db";
import { inArray } from "drizzle-orm";
import {
  getProfileAudience,
  canViewProfileDetails,
  canViewPost,
  canSendFriendRequest,
  filterVisiblePosts,
} from "./authz";
import { buildProfileDetail } from "./serialize";

// Locks in that the profileVisibility / postVisibility / friendRequestPrivacy
// settings are actually enforced (not just persisted) by the shared authz
// resolvers every read/write path routes through.

const owner = randomUUID();
const friend = randomUUID();
const stranger = randomUUID();
const mutual = randomUUID();
const allIds = [owner, friend, stranger, mutual];

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function setVisibility(opts: {
  profileVisibility?: string;
  isLocked?: boolean;
  friendRequestPrivacy?: string;
}) {
  await db
    .insert(userSettingsTable)
    .values({ userId: owner, ...opts })
    .onConflictDoUpdate({ target: userSettingsTable.userId, set: opts });
}

beforeAll(async () => {
  await db.insert(profilesTable).values(
    allIds.map((id) => ({
      id,
      username: `authz-${id.slice(0, 8)}`,
      displayName: "Authz Test User",
    })),
  );
  // owner <-> friend are friends. mutual is a friend of both stranger and owner.
  const [oa, ob] = pair(owner, friend);
  const [ma, mb] = pair(owner, mutual);
  const [sa, sb] = pair(stranger, mutual);
  await db
    .insert(friendshipsTable)
    .values([
      { userAId: oa, userBId: ob },
      { userAId: ma, userBId: mb },
      { userAId: sa, userBId: sb },
    ]);
});

afterAll(async () => {
  await db.delete(profilesTable).where(inArray(profilesTable.id, allIds));
  await pool.end();
});

describe("getProfileAudience", () => {
  it("defaults to public with no settings row", async () => {
    expect(await getProfileAudience(stranger)).toBe("public");
  });

  it("maps profileVisibility only_me / friends and the lock toggle", async () => {
    await setVisibility({ profileVisibility: "only_me" });
    expect(await getProfileAudience(owner)).toBe("only_me");
    await setVisibility({ profileVisibility: "friends" });
    expect(await getProfileAudience(owner)).toBe("friends");
    await setVisibility({ profileVisibility: "public", isLocked: true });
    expect(await getProfileAudience(owner)).toBe("friends");
    await setVisibility({ profileVisibility: "public", isLocked: false });
    expect(await getProfileAudience(owner)).toBe("public");
  });
});

describe("canViewProfileDetails", () => {
  it("public profile is visible to everyone", async () => {
    await setVisibility({ profileVisibility: "public", isLocked: false });
    expect(await canViewProfileDetails(owner, stranger)).toBe(true);
    expect(await canViewProfileDetails(owner, friend)).toBe(true);
  });

  it("friends-only profile hides details from non-friends", async () => {
    await setVisibility({ profileVisibility: "friends" });
    expect(await canViewProfileDetails(owner, friend)).toBe(true);
    expect(await canViewProfileDetails(owner, stranger)).toBe(false);
    expect(await canViewProfileDetails(owner, owner)).toBe(true);
  });

  it("only_me profile hides details from everyone but the owner", async () => {
    await setVisibility({ profileVisibility: "only_me" });
    expect(await canViewProfileDetails(owner, friend)).toBe(false);
    expect(await canViewProfileDetails(owner, stranger)).toBe(false);
    expect(await canViewProfileDetails(owner, owner)).toBe(true);
  });
});

describe("canViewPost honors the author's profile audience", () => {
  const publicPost = (authorId: string) =>
    ({ authorId, privacy: "public" as const, groupId: null, pendingApproval: false });

  it("public profile: public post visible to a stranger", async () => {
    await setVisibility({ profileVisibility: "public", isLocked: false });
    expect(await canViewPost(publicPost(owner), stranger)).toBe(true);
  });

  it("friends-only profile: even public posts hidden from non-friends", async () => {
    await setVisibility({ profileVisibility: "friends" });
    expect(await canViewPost(publicPost(owner), stranger)).toBe(false);
    expect(await canViewPost(publicPost(owner), friend)).toBe(true);
  });

  it("only_me profile: posts hidden from friends too", async () => {
    await setVisibility({ profileVisibility: "only_me" });
    expect(await canViewPost(publicPost(owner), friend)).toBe(false);
    expect(await canViewPost(publicPost(owner), owner)).toBe(true);
  });
});

describe("filterVisiblePosts (feed) honors audience + per-post privacy", () => {
  const post = (
    authorId: string,
    privacy: "public" | "friends" | "private",
  ) => ({
    authorId,
    privacy,
    groupId: null as number | null,
    pendingApproval: false,
  });

  it("public profile: friend sees public+friends but NOT private posts", async () => {
    await setVisibility({ profileVisibility: "public", isLocked: false });
    const rows = [
      post(owner, "public"),
      post(owner, "friends"),
      post(owner, "private"),
    ];
    const visible = await filterVisiblePosts(rows, friend);
    expect(visible.map((p) => p.privacy).sort()).toEqual(["friends", "public"]);
  });

  it("friends-only profile: stranger sees nothing even from public posts", async () => {
    await setVisibility({ profileVisibility: "friends" });
    const rows = [post(owner, "public"), post(owner, "friends")];
    expect(await filterVisiblePosts(rows, stranger)).toHaveLength(0);
    expect(await filterVisiblePosts(rows, friend)).toHaveLength(2);
  });

  it("only_me profile: a friend's posts never leak into the feed", async () => {
    await setVisibility({ profileVisibility: "only_me" });
    const rows = [
      post(owner, "public"),
      post(owner, "friends"),
      post(owner, "private"),
    ];
    expect(await filterVisiblePosts(rows, friend)).toHaveLength(0);
    // owner still sees their own posts
    expect(await filterVisiblePosts(rows, owner)).toHaveLength(3);
  });
});

describe("canSendFriendRequest honors friendRequestPrivacy", () => {
  it("everyone (default): any user may send a request", async () => {
    await setVisibility({
      profileVisibility: "public",
      friendRequestPrivacy: "everyone",
    });
    expect(await canSendFriendRequest(stranger, owner)).toBe(true);
  });

  it("friends_of_friends: requires a mutual friend", async () => {
    await setVisibility({ friendRequestPrivacy: "friends_of_friends" });
    // `friend` has no mutual friend with owner besides being a direct friend.
    expect(await canSendFriendRequest(friend, owner)).toBe(true); // already friends
    // `stranger` shares `mutual` as a common friend with owner.
    expect(await canSendFriendRequest(stranger, owner)).toBe(true);
    // a brand-new user with no friends cannot.
    expect(await canSendFriendRequest(randomUUID(), owner)).toBe(false);
  });
});

describe("buildProfileDetail exposes viewerCanSendRequest", () => {
  it("everyone: a stranger may send a request", async () => {
    await setVisibility({
      profileVisibility: "public",
      friendRequestPrivacy: "everyone",
    });
    const detail = await buildProfileDetail(owner, stranger);
    expect(detail?.viewerCanSendRequest).toBe(true);
  });

  it("friends_of_friends: a friendless stranger may NOT send a request", async () => {
    await setVisibility({
      profileVisibility: "public",
      friendRequestPrivacy: "friends_of_friends",
    });
    const detail = await buildProfileDetail(owner, randomUUID());
    expect(detail?.viewerCanSendRequest).toBe(false);
  });

  it("already friends: no request can be sent", async () => {
    await setVisibility({
      profileVisibility: "public",
      friendRequestPrivacy: "everyone",
    });
    const detail = await buildProfileDetail(owner, friend);
    expect(detail?.viewerCanSendRequest).toBe(false);
  });
});
