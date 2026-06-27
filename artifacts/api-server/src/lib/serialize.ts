import {
  db,
  profilesTable,
  postsTable,
  postMediaTable,
  postReactionsTable,
  commentsTable,
  commentReactionsTable,
  sharesTable,
  friendshipsTable,
  friendRequestsTable,
  followsTable,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  messageAttachmentsTable,
  messageReactionsTable,
  groupsTable,
  groupMembersTable,
  pagesTable,
  pageFollowersTable,
  storiesTable,
  storyViewsTable,
  reelsTable,
  reelLikesTable,
  reelCommentsTable,
  notificationsTable,
  type Profile as ProfileRow,
  type Post as PostRow,
  type Comment as CommentRow,
  type Conversation as ConversationRow,
  type Message as MessageRow,
  type Group as GroupRow,
  type Page as PageRow,
  type Story as StoryRow,
  type Reel as ReelRow,
  type Notification as NotificationRow,
} from "@workspace/db";
import {
  and,
  eq,
  ne,
  or,
  gt,
  inArray,
  desc,
  asc,
  count,
  isNull,
} from "drizzle-orm";

// ---------------- Profiles ----------------
export function toProfile(row: ProfileRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    bio: row.bio,
    location: row.location,
    work: row.work,
    isVerified: row.isVerified,
    createdAt: row.createdAt,
  };
}

async function loadProfileMap(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map<string, ReturnType<typeof toProfile>>();
  const rows = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, unique));
  return new Map(rows.map((r) => [r.id, toProfile(r)]));
}

export async function buildProfileDetail(userId: string, viewerId?: string) {
  const [row] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (!row) return null;

  const [[friends], [followers], [following], [posts]] = await Promise.all([
    db
      .select({ value: count() })
      .from(friendshipsTable)
      .where(
        or(
          eq(friendshipsTable.userAId, userId),
          eq(friendshipsTable.userBId, userId),
        ),
      ),
    db
      .select({ value: count() })
      .from(followsTable)
      .where(eq(followsTable.followingId, userId)),
    db
      .select({ value: count() })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId)),
    db
      .select({ value: count() })
      .from(postsTable)
      .where(eq(postsTable.authorId, userId)),
  ]);

  let viewerIsFriend: boolean | undefined;
  let viewerHasPendingRequest: boolean | undefined;
  let viewerFollows: boolean | undefined;
  if (viewerId && viewerId !== userId) {
    const [a, b] = userId < viewerId ? [userId, viewerId] : [viewerId, userId];
    const [friendRow] = await db
      .select()
      .from(friendshipsTable)
      .where(
        and(
          eq(friendshipsTable.userAId, a),
          eq(friendshipsTable.userBId, b),
        ),
      );
    viewerIsFriend = Boolean(friendRow);
    const [reqRow] = await db
      .select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.status, "pending"),
          or(
            and(
              eq(friendRequestsTable.requesterId, viewerId),
              eq(friendRequestsTable.addresseeId, userId),
            ),
            and(
              eq(friendRequestsTable.requesterId, userId),
              eq(friendRequestsTable.addresseeId, viewerId),
            ),
          ),
        ),
      );
    viewerHasPendingRequest = Boolean(reqRow);
    const [followRow] = await db
      .select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.followerId, viewerId),
          eq(followsTable.followingId, userId),
        ),
      );
    viewerFollows = Boolean(followRow);
  }

  return {
    ...toProfile(row),
    friendCount: friends?.value ?? 0,
    followerCount: followers?.value ?? 0,
    followingCount: following?.value ?? 0,
    postCount: posts?.value ?? 0,
    viewerIsFriend,
    viewerHasPendingRequest,
    viewerFollows,
  };
}

// ---------------- Posts ----------------
export async function buildPosts(rows: PostRow[], viewerId?: string) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorMap = await loadProfileMap(rows.map((r) => r.authorId));

  const [mediaRows, reactRows, viewerReacts, commentCounts, shareCounts] =
    await Promise.all([
      db
        .select()
        .from(postMediaTable)
        .where(inArray(postMediaTable.postId, ids))
        .orderBy(asc(postMediaTable.position)),
      db
        .select({
          postId: postReactionsTable.postId,
          type: postReactionsTable.type,
          value: count(),
        })
        .from(postReactionsTable)
        .where(inArray(postReactionsTable.postId, ids))
        .groupBy(postReactionsTable.postId, postReactionsTable.type),
      viewerId
        ? db
            .select()
            .from(postReactionsTable)
            .where(
              and(
                inArray(postReactionsTable.postId, ids),
                eq(postReactionsTable.userId, viewerId),
              ),
            )
        : Promise.resolve([]),
      db
        .select({ postId: commentsTable.postId, value: count() })
        .from(commentsTable)
        .where(inArray(commentsTable.postId, ids))
        .groupBy(commentsTable.postId),
      db
        .select({ postId: sharesTable.postId, value: count() })
        .from(sharesTable)
        .where(inArray(sharesTable.postId, ids))
        .groupBy(sharesTable.postId),
    ]);

  const mediaByPost = new Map<number, typeof mediaRows>();
  for (const m of mediaRows) {
    const list = mediaByPost.get(m.postId) ?? [];
    list.push(m);
    mediaByPost.set(m.postId, list);
  }
  const reactByPost = new Map<number, { total: number; byType: Record<string, number> }>();
  for (const r of reactRows) {
    const entry = reactByPost.get(r.postId) ?? { total: 0, byType: {} };
    entry.byType[r.type] = r.value;
    entry.total += r.value;
    reactByPost.set(r.postId, entry);
  }
  const viewerReactByPost = new Map<number, string>();
  for (const r of viewerReacts) viewerReactByPost.set(r.postId, r.type);
  const commentCountByPost = new Map(commentCounts.map((c) => [c.postId, c.value]));
  const shareCountByPost = new Map(shareCounts.map((s) => [s.postId, s.value]));

  return rows.map((row) => {
    const summary = reactByPost.get(row.id) ?? { total: 0, byType: {} };
    return {
      id: row.id,
      author: authorMap.get(row.authorId)!,
      content: row.content,
      privacy: row.privacy,
      groupId: row.groupId,
      pageId: row.pageId,
      media: (mediaByPost.get(row.id) ?? []).map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type,
        thumbnailUrl: m.thumbnailUrl,
        width: m.width,
        height: m.height,
        durationMs: m.durationMs,
        position: m.position,
      })),
      reactions: {
        total: summary.total,
        byType: summary.byType,
        viewerReaction: viewerReactByPost.get(row.id) ?? null,
      },
      commentCount: commentCountByPost.get(row.id) ?? 0,
      shareCount: shareCountByPost.get(row.id) ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

export async function buildPostById(id: number, viewerId?: string) {
  const [row] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!row) return null;
  const [post] = await buildPosts([row], viewerId);
  return post;
}

export async function buildReactionSummary(postId: number, viewerId?: string) {
  const reactRows = await db
    .select({ type: postReactionsTable.type, value: count() })
    .from(postReactionsTable)
    .where(eq(postReactionsTable.postId, postId))
    .groupBy(postReactionsTable.type);
  const byType: Record<string, number> = {};
  let total = 0;
  for (const r of reactRows) {
    byType[r.type] = r.value;
    total += r.value;
  }
  let viewerReaction: string | null = null;
  if (viewerId) {
    const [vr] = await db
      .select()
      .from(postReactionsTable)
      .where(
        and(
          eq(postReactionsTable.postId, postId),
          eq(postReactionsTable.userId, viewerId),
        ),
      );
    viewerReaction = vr?.type ?? null;
  }
  return { total, byType, viewerReaction };
}

// ---------------- Comments ----------------
export async function buildComments(rows: CommentRow[], viewerId?: string) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorMap = await loadProfileMap(rows.map((r) => r.authorId));
  const [reactCounts, viewerReacts, replyCounts] = await Promise.all([
    db
      .select({ commentId: commentReactionsTable.commentId, value: count() })
      .from(commentReactionsTable)
      .where(inArray(commentReactionsTable.commentId, ids))
      .groupBy(commentReactionsTable.commentId),
    viewerId
      ? db
          .select()
          .from(commentReactionsTable)
          .where(
            and(
              inArray(commentReactionsTable.commentId, ids),
              eq(commentReactionsTable.userId, viewerId),
            ),
          )
      : Promise.resolve([]),
    db
      .select({ parentId: commentsTable.parentId, value: count() })
      .from(commentsTable)
      .where(inArray(commentsTable.parentId, ids))
      .groupBy(commentsTable.parentId),
  ]);
  const reactCountByComment = new Map(reactCounts.map((c) => [c.commentId, c.value]));
  const viewerReactByComment = new Map<number, string>();
  for (const r of viewerReacts) viewerReactByComment.set(r.commentId, r.type);
  const replyCountByComment = new Map<number, number>();
  for (const r of replyCounts) {
    if (r.parentId != null) replyCountByComment.set(r.parentId, r.value);
  }
  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    author: authorMap.get(row.authorId)!,
    parentId: row.parentId,
    content: row.content,
    mediaUrl: row.mediaUrl,
    createdAt: row.createdAt,
    reactionCount: reactCountByComment.get(row.id) ?? 0,
    replyCount: replyCountByComment.get(row.id) ?? 0,
    viewerReaction: viewerReactByComment.get(row.id) ?? null,
  }));
}

export async function buildCommentById(id: number, viewerId?: string) {
  const [row] = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.id, id));
  if (!row) return null;
  const [c] = await buildComments([row], viewerId);
  return c;
}

// ---------------- Messages ----------------
export async function buildMessages(rows: MessageRow[], viewerId?: string) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const senderMap = await loadProfileMap(rows.map((r) => r.senderId));
  const [attachments, reactRows] = await Promise.all([
    db
      .select()
      .from(messageAttachmentsTable)
      .where(inArray(messageAttachmentsTable.messageId, ids)),
    db
      .select()
      .from(messageReactionsTable)
      .where(inArray(messageReactionsTable.messageId, ids)),
  ]);
  const attByMsg = new Map<number, typeof attachments>();
  for (const a of attachments) {
    const list = attByMsg.get(a.messageId) ?? [];
    list.push(a);
    attByMsg.set(a.messageId, list);
  }
  const reactByMsg = new Map<
    number,
    Map<string, { count: number; viewerReacted: boolean }>
  >();
  for (const r of reactRows) {
    const m = reactByMsg.get(r.messageId) ?? new Map();
    const e = m.get(r.emoji) ?? { count: 0, viewerReacted: false };
    e.count += 1;
    if (viewerId && r.userId === viewerId) e.viewerReacted = true;
    m.set(r.emoji, e);
    reactByMsg.set(r.messageId, m);
  }
  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    sender: senderMap.get(row.senderId)!,
    content: row.deletedAt ? "" : row.content,
    type: row.type,
    replyToId: row.replyToId,
    attachments: row.deletedAt
      ? []
      : (attByMsg.get(row.id) ?? []).map((a) => ({
          id: a.id,
          url: a.url,
          type: a.type,
          name: a.name,
          thumbnailUrl: a.thumbnailUrl,
          sizeBytes: a.sizeBytes,
          width: a.width,
          height: a.height,
          durationMs: a.durationMs,
        })),
    reactions: [...(reactByMsg.get(row.id)?.entries() ?? [])].map(
      ([emoji, v]) => ({
        emoji,
        count: v.count,
        viewerReacted: v.viewerReacted,
      }),
    ),
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    deletedAt: row.deletedAt,
  }));
}

export async function buildMessageById(id: number, viewerId?: string) {
  const [row] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id));
  if (!row) return null;
  const [m] = await buildMessages([row], viewerId);
  return m;
}

// ---------------- Conversations ----------------
export async function buildConversations(
  rows: ConversationRow[],
  viewerId: string,
) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const memberRows = await db
    .select()
    .from(conversationMembersTable)
    .where(inArray(conversationMembersTable.conversationId, ids));
  const profileMap = await loadProfileMap(memberRows.map((m) => m.userId));
  const membersByConv = new Map<number, typeof memberRows>();
  for (const m of memberRows) {
    const list = membersByConv.get(m.conversationId) ?? [];
    list.push(m);
    membersByConv.set(m.conversationId, list);
  }

  // Last message per conversation
  const lastMsgRows = await db
    .select()
    .from(messagesTable)
    .where(inArray(messagesTable.conversationId, ids))
    .orderBy(desc(messagesTable.createdAt));
  const lastMsgByConv = new Map<number, MessageRow>();
  for (const m of lastMsgRows) {
    if (!lastMsgByConv.has(m.conversationId))
      lastMsgByConv.set(m.conversationId, m);
  }
  const builtLast = await buildMessages([...lastMsgByConv.values()], viewerId);
  const builtLastByConv = new Map(builtLast.map((m) => [m.conversationId, m]));

  return Promise.all(
    rows.map(async (row) => {
      const members = membersByConv.get(row.id) ?? [];
      const viewerMember = members.find((m) => m.userId === viewerId);
      const [unread] = await db
        .select({ value: count() })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, row.id),
            ne(messagesTable.senderId, viewerId),
            gt(messagesTable.id, viewerMember?.lastReadMessageId ?? 0),
          ),
        );
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        avatarUrl: row.avatarUrl,
        members: members.map((m) => ({
          user: profileMap.get(m.userId)!,
          role: m.role,
          lastReadMessageId: m.lastReadMessageId,
          joinedAt: m.joinedAt,
        })),
        lastMessage: builtLastByConv.get(row.id) ?? null,
        unreadCount: unread?.value ?? 0,
        createdAt: row.createdAt,
        lastMessageAt: row.lastMessageAt,
      };
    }),
  );
}

export async function buildConversationById(id: number, viewerId: string) {
  const [row] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  if (!row) return null;
  const [c] = await buildConversations([row], viewerId);
  return c;
}

// ---------------- Groups ----------------
export async function buildGroup(row: GroupRow, viewerId?: string) {
  const [[members], viewerRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(groupMembersTable)
      .where(eq(groupMembersTable.groupId, row.id)),
    viewerId
      ? db
          .select()
          .from(groupMembersTable)
          .where(
            and(
              eq(groupMembersTable.groupId, row.id),
              eq(groupMembersTable.userId, viewerId),
            ),
          )
      : Promise.resolve([]),
  ]);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    privacy: row.privacy,
    memberCount: members?.value ?? 0,
    viewerIsMember: Array.isArray(viewerRow) ? viewerRow.length > 0 : false,
    createdAt: row.createdAt,
  };
}

// ---------------- Pages ----------------
export async function buildPage(row: PageRow, viewerId?: string) {
  const [[followers], viewerRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(pageFollowersTable)
      .where(eq(pageFollowersTable.pageId, row.id)),
    viewerId
      ? db
          .select()
          .from(pageFollowersTable)
          .where(
            and(
              eq(pageFollowersTable.pageId, row.id),
              eq(pageFollowersTable.userId, viewerId),
            ),
          )
      : Promise.resolve([]),
  ]);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    followerCount: followers?.value ?? 0,
    viewerFollows: Array.isArray(viewerRow) ? viewerRow.length > 0 : false,
    createdAt: row.createdAt,
  };
}

// ---------------- Stories ----------------
export async function buildStoryGroups(viewerId: string) {
  const now = new Date();
  const rows = await db
    .select()
    .from(storiesTable)
    .where(gt(storiesTable.expiresAt, now))
    .orderBy(asc(storiesTable.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorMap = await loadProfileMap(rows.map((r) => r.authorId));
  const [viewRows, viewCounts] = await Promise.all([
    db
      .select()
      .from(storyViewsTable)
      .where(
        and(
          inArray(storyViewsTable.storyId, ids),
          eq(storyViewsTable.viewerId, viewerId),
        ),
      ),
    db
      .select({ storyId: storyViewsTable.storyId, value: count() })
      .from(storyViewsTable)
      .where(inArray(storyViewsTable.storyId, ids))
      .groupBy(storyViewsTable.storyId),
  ]);
  const viewedSet = new Set(viewRows.map((v) => v.storyId));
  const viewCountByStory = new Map(viewCounts.map((v) => [v.storyId, v.value]));

  const byAuthor = new Map<string, StoryRow[]>();
  for (const s of rows) {
    const list = byAuthor.get(s.authorId) ?? [];
    list.push(s);
    byAuthor.set(s.authorId, list);
  }
  return [...byAuthor.entries()].map(([authorId, stories]) => ({
    author: authorMap.get(authorId)!,
    stories: stories.map((s) => ({
      id: s.id,
      author: authorMap.get(authorId)!,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
      caption: s.caption,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      viewCount: viewCountByStory.get(s.id) ?? 0,
      viewerHasViewed: viewedSet.has(s.id),
    })),
    hasUnseen: stories.some((s) => !viewedSet.has(s.id)),
  }));
}

export function toStory(
  s: StoryRow,
  author: ReturnType<typeof toProfile>,
  viewCount = 0,
  viewerHasViewed = false,
) {
  return {
    id: s.id,
    author,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType,
    caption: s.caption,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    viewCount,
    viewerHasViewed,
  };
}

// ---------------- Reels ----------------
export async function buildReels(rows: ReelRow[], viewerId?: string) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorMap = await loadProfileMap(rows.map((r) => r.authorId));
  const [likeCounts, viewerLikes, commentCounts] = await Promise.all([
    db
      .select({ reelId: reelLikesTable.reelId, value: count() })
      .from(reelLikesTable)
      .where(inArray(reelLikesTable.reelId, ids))
      .groupBy(reelLikesTable.reelId),
    viewerId
      ? db
          .select()
          .from(reelLikesTable)
          .where(
            and(
              inArray(reelLikesTable.reelId, ids),
              eq(reelLikesTable.userId, viewerId),
            ),
          )
      : Promise.resolve([]),
    db
      .select({ reelId: reelCommentsTable.reelId, value: count() })
      .from(reelCommentsTable)
      .where(inArray(reelCommentsTable.reelId, ids))
      .groupBy(reelCommentsTable.reelId),
  ]);
  const likeCountByReel = new Map(likeCounts.map((l) => [l.reelId, l.value]));
  const likedSet = new Set(viewerLikes.map((l) => l.reelId));
  const commentCountByReel = new Map(commentCounts.map((c) => [c.reelId, c.value]));
  return rows.map((row) => ({
    id: row.id,
    author: authorMap.get(row.authorId)!,
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    caption: row.caption,
    createdAt: row.createdAt,
    likeCount: likeCountByReel.get(row.id) ?? 0,
    commentCount: commentCountByReel.get(row.id) ?? 0,
    viewerHasLiked: likedSet.has(row.id),
  }));
}

export async function buildReelById(id: number, viewerId?: string) {
  const [row] = await db.select().from(reelsTable).where(eq(reelsTable.id, id));
  if (!row) return null;
  const [r] = await buildReels([row], viewerId);
  return r;
}

// ---------------- Notifications ----------------
export async function buildNotifications(rows: NotificationRow[]) {
  if (rows.length === 0) return [];
  const actorIds = rows
    .map((r) => r.actorId)
    .filter((id): id is string => Boolean(id));
  const actorMap = await loadProfileMap(actorIds);
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    actor: row.actorId ? (actorMap.get(row.actorId) ?? null) : null,
    entityType: row.entityType,
    entityId: row.entityId,
    isRead: row.isRead,
    createdAt: row.createdAt,
  }));
}

// ---------------- Shared helpers ----------------
export { and, eq, ne, or, gt, inArray, desc, asc, count, isNull };
