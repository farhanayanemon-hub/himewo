import {
  db,
  friendshipsTable,
  groupMembersTable,
  commentsTable,
  postsTable,
} from "@workspace/db";
import { and, eq, or } from "drizzle-orm";

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
      ),
    );
  return Boolean(row);
}

type PostVisibility = {
  authorId: string;
  privacy: "public" | "friends" | "private";
  groupId: number | null;
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
  if (post.groupId != null) return isGroupMember(post.groupId, viewerId);
  if (post.privacy === "public") return true;
  if (post.privacy === "friends") return areFriends(post.authorId, viewerId);
  return false;
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
    })
    .from(commentsTable)
    .innerJoin(postsTable, eq(commentsTable.postId, postsTable.id))
    .where(eq(commentsTable.id, commentId));
  if (!row) return false;
  return canViewPost(row, viewerId);
}
