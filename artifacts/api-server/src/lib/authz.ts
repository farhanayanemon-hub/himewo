import {
  db,
  friendshipsTable,
  groupMembersTable,
  commentsTable,
  postsTable,
  userSettingsTable,
} from "@workspace/db";
import { and, eq, or, inArray } from "drizzle-orm";

/**
 * True when the user has enabled Facebook-style "Lock Profile". A missing
 * settings row means the default (unlocked).
 */
export async function isProfileLocked(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ isLocked: userSettingsTable.isLocked })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  return Boolean(row?.isLocked);
}

/**
 * Effective audience for a user's profile + timeline, combining the
 * `profileVisibility` setting with the Facebook-style "Lock Profile" toggle.
 * Both narrow who (besides the owner) may see timeline content, intro details,
 * posts and friends:
 * - "public": anyone
 * - "friends": friends only (this is also what an enabled lock means)
 * - "only_me": owner only
 * A missing settings row means the default ("public").
 *
 * **Why a single resolver:** `profileVisibility` and `isLocked` overlap, so
 * collapsing them here keeps every read path (feed, profile, posts, friends,
 * canViewPost) enforcing one consistent rule instead of re-deriving it.
 */
export type ProfileAudience = "public" | "friends" | "only_me";

export async function getProfileAudience(
  userId: string,
): Promise<ProfileAudience> {
  const [row] = await db
    .select({
      isLocked: userSettingsTable.isLocked,
      profileVisibility: userSettingsTable.profileVisibility,
    })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  if (!row) return "public";
  if (row.profileVisibility === "only_me") return "only_me";
  if (row.isLocked || row.profileVisibility === "friends") return "friends";
  return "public";
}

/**
 * Whether `viewerId` may see `targetId`'s profile details (intro, posts,
 * friends list). The owner always can; otherwise governed by the effective
 * profile audience.
 */
export async function canViewProfileDetails(
  targetId: string,
  viewerId: string,
): Promise<boolean> {
  if (targetId === viewerId) return true;
  const audience = await getProfileAudience(targetId);
  if (audience === "public") return true;
  if (audience === "only_me") return false;
  return areFriends(targetId, viewerId);
}

async function friendIdsOf(userId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        eq(friendshipsTable.userAId, userId),
        eq(friendshipsTable.userBId, userId),
      ),
    );
  return rows.map((f) => (f.userAId === userId ? f.userBId : f.userAId));
}

/**
 * Enforces the addressee's `friendRequestPrivacy` setting:
 * - "everyone" (default): anyone may send a request.
 * - "friends_of_friends": the requester must share at least one mutual friend
 *   with the addressee.
 * A missing settings row means the default ("everyone").
 */
export async function canSendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<boolean> {
  if (requesterId === addresseeId) return false;
  const [row] = await db
    .select({ friendRequestPrivacy: userSettingsTable.friendRequestPrivacy })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, addresseeId));
  const privacy = row?.friendRequestPrivacy ?? "everyone";
  if (privacy !== "friends_of_friends") return true;
  if (await areFriends(requesterId, addresseeId)) return true;
  const requesterFriends = new Set(await friendIdsOf(requesterId));
  if (requesterFriends.size === 0) return false;
  const addresseeFriends = await friendIdsOf(addresseeId);
  return addresseeFriends.some((id) => requesterFriends.has(id));
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const [row] = await db
    .select({ id: friendshipsTable.id })
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.userAId, a), eq(friendshipsTable.userBId, b)),
        and(eq(friendshipsTable.userAId, b), eq(friendshipsTable.userBId, a)),
      ),
    );
  return Boolean(row);
}

export async function isGroupMember(
  groupId: number,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: groupMembersTable.userId })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
        eq(groupMembersTable.status, "active"),
      ),
    );
  return Boolean(row);
}

/** True when the user is an active admin or moderator of the group. */
export async function isGroupModerator(
  groupId: number,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
        eq(groupMembersTable.status, "active"),
      ),
    );
  return !!row && (row.role === "admin" || row.role === "moderator");
}

type PostVisibility = {
  authorId: string;
  privacy: "public" | "friends" | "private" | "hidden";
  groupId: number | null;
  pendingApproval: boolean;
};

/**
 * Enforces post-level read visibility:
 * - Author can always view.
 * - Group posts: visible to group members only.
 * - public: anyone. friends: author's friends. private: author only.
 */
export async function canViewPost(
  post: PostVisibility,
  viewerId: string,
): Promise<boolean> {
  if (post.authorId === viewerId) return true;
  // Pending group posts stay in the approval queue: only the author (handled
  // above) and the group's active moderators/admins may see them.
  if (post.pendingApproval && post.groupId != null) {
    return isGroupModerator(post.groupId, viewerId);
  }
  // Group posts are governed by group membership, not the author's profile lock.
  if (post.groupId != null) return isGroupMember(post.groupId, viewerId);
  const friend = await areFriends(post.authorId, viewerId);
  // Author's effective profile audience (lock + profileVisibility) gates the
  // whole timeline before per-post privacy: "only_me" hides everything from
  // non-owners, "friends" hides everything (even public posts) from non-friends.
  const audience = await getProfileAudience(post.authorId);
  if (audience === "only_me") return false;
  if (audience === "friends" && !friend) return false;
  if (post.privacy === "public") return true;
  if (post.privacy === "friends") return friend;
  return false;
}

/**
 * Batch version of `canViewPost` for a list of posts and a single viewer.
 * Applies the exact same policy (author audience -> per-post privacy; group
 * posts via membership) but loads the viewer's friends and the authors'
 * settings once instead of per post. Use this for any multi-post read path
 * (e.g. /feed) so visibility can never drift from canViewPost.
 */
export async function filterVisiblePosts<T extends PostVisibility>(
  posts: T[],
  viewerId: string,
): Promise<T[]> {
  if (posts.length === 0) return posts;
  const friendRows = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        eq(friendshipsTable.userAId, viewerId),
        eq(friendshipsTable.userBId, viewerId),
      ),
    );
  const friendSet = new Set(
    friendRows.map((f) => (f.userAId === viewerId ? f.userBId : f.userAId)),
  );
  const timelineAuthorIds = [
    ...new Set(posts.filter((p) => p.groupId == null).map((p) => p.authorId)),
  ].filter((a) => a !== viewerId);
  const audienceByAuthor = new Map<string, ProfileAudience>();
  if (timelineAuthorIds.length > 0) {
    const settings = await db
      .select({
        userId: userSettingsTable.userId,
        isLocked: userSettingsTable.isLocked,
        profileVisibility: userSettingsTable.profileVisibility,
      })
      .from(userSettingsTable)
      .where(inArray(userSettingsTable.userId, timelineAuthorIds));
    for (const s of settings) {
      audienceByAuthor.set(
        s.userId,
        s.profileVisibility === "only_me"
          ? "only_me"
          : s.isLocked || s.profileVisibility === "friends"
            ? "friends"
            : "public",
      );
    }
  }
  const result: T[] = [];
  for (const p of posts) {
    // Group posts are governed by membership; defer to the single-post policy.
    if (p.groupId != null) {
      if (await canViewPost(p, viewerId)) result.push(p);
      continue;
    }
    if (p.authorId === viewerId) {
      result.push(p);
      continue;
    }
    const audience = audienceByAuthor.get(p.authorId) ?? "public";
    const friend = friendSet.has(p.authorId);
    if (audience === "only_me") continue;
    if (audience === "friends" && !friend) continue;
    if (p.privacy === "public" || (p.privacy === "friends" && friend)) {
      result.push(p);
    }
    // private: author only -> skipped for non-owners.
  }
  return result;
}

/**
 * A comment is viewable iff its parent post is viewable. Returns false when the
 * comment (or its parent post) does not exist.
 */
export async function canViewComment(
  commentId: number,
  viewerId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      authorId: postsTable.authorId,
      privacy: postsTable.privacy,
      groupId: postsTable.groupId,
      pendingApproval: postsTable.pendingApproval,
    })
    .from(commentsTable)
    .innerJoin(postsTable, eq(commentsTable.postId, postsTable.id))
    .where(eq(commentsTable.id, commentId));
  if (!row) return false;
  return canViewPost(row, viewerId);
}
