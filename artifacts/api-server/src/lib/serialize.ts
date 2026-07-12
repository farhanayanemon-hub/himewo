import {
  db,
  profilesTable,
  postsTable,
  postMediaTable,
  postReactionsTable,
  commentsTable,
  commentReactionsTable,
  sharesTable,
  pollsTable,
  pollOptionsTable,
  pollVotesTable,
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
  pageFollowingTable,
  pageMembersTable,
  pageReviewsTable,
  storiesTable,
  storyViewsTable,
  storyReactionsTable,
  reelsTable,
  reelLikesTable,
  reelCommentsTable,
  notificationsTable,
  marketplaceListingsTable,
  savedItemsTable,
  userSettingsTable,
  type Profile as ProfileRow,
  type MarketplaceListing as MarketplaceListingRow,
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
  avg,
  isNull,
} from "drizzle-orm";
import {
  canViewPost,
  canSendFriendRequest,
  filterVisibleStories,
  canViewStory,
  canViewReel,
} from "./authz";

// ---------------- Profiles ----------------
/**
 * Serialize a profile. Intro/bio details are ONLY included on the full profile
 * page (`includeIntro`), never on embedded profiles (post/reel/story authors,
 * reaction users, list results) — this keeps a locked user's intro from leaking
 * to non-friends through those payloads. Contact (email/phone) is owner-only.
 */
export function toProfile(
  row: ProfileRow,
  includeContact = false,
  includeIntro = false,
) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: includeContact ? row.email : null,
    phone: includeContact ? row.phone : null,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    bio: includeIntro ? row.bio : null,
    birthday: includeIntro ? row.birthday : null,
    // Name parts are as public as displayName itself.
    firstName: row.firstName,
    lastName: row.lastName,
    gender: includeIntro ? row.gender : null,
    country: includeIntro ? row.country : null,
    location: includeIntro ? row.location : null,
    work: includeIntro ? row.work : null,
    education: includeIntro ? row.education : null,
    hometown: includeIntro ? row.hometown : null,
    hobbies: includeIntro ? row.hobbies : null,
    interests: includeIntro ? row.interests : null,
    website: includeIntro ? row.website : null,
    isVerified: row.isVerified,
    createdAt: row.createdAt,
    // Rename-cooldown timestamps are owner-only (shown in Settings).
    usernameChangedAt: includeContact ? row.usernameChangedAt : null,
    displayNameChangedAt: includeContact ? row.displayNameChangedAt : null,
    // Owner-only: gates the one-time post-signup onboarding flow.
    hasCompletedOnboarding: includeContact
      ? row.onboardingCompletedAt !== null
      : null,
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

export type PageRefDto = { id: number; name: string; avatarUrl: string | null };

/**
 * Lightweight page identity used when a post/comment/reaction is authored AS a
 * page. Loads only the fields needed to render the page's name + avatar.
 */
async function loadPageRefMap(ids: (number | null)[]) {
  const unique = [...new Set(ids.filter((id): id is number => id != null))];
  if (unique.length === 0) return new Map<number, PageRefDto>();
  const rows = await db
    .select({
      id: pagesTable.id,
      name: pagesTable.name,
      avatarUrl: pagesTable.avatarUrl,
    })
    .from(pagesTable)
    .where(inArray(pagesTable.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * Serialize a list of profiles (search, suggestions, friends lists). Intro
 * details are already excluded by `toProfile`; this only attaches `isLocked`
 * so clients can render a lock indicator next to locked users.
 */
export async function buildListProfiles(rows: ProfileRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const lockedRows = await db
    .select({ userId: userSettingsTable.userId })
    .from(userSettingsTable)
    .where(
      and(
        inArray(userSettingsTable.userId, ids),
        eq(userSettingsTable.isLocked, true),
      ),
    );
  const lockedSet = new Set(lockedRows.map((l) => l.userId));
  return rows.map((r) => ({ ...toProfile(r), isLocked: lockedSet.has(r.id) }));
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
  let viewerCanSendRequest: boolean | undefined;
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
    // Surface the server-side friend-request rule (friendRequestPrivacy) so
    // clients can hide/disable "Add Friend" instead of letting it 403. Only
    // meaningful when not already friends and no request is pending.
    viewerCanSendRequest =
      !viewerIsFriend &&
      !viewerHasPendingRequest &&
      (await canSendFriendRequest(viewerId, userId));
  }

  const [settingsRow] = await db
    .select({
      isLocked: userSettingsTable.isLocked,
      profileVisibility: userSettingsTable.profileVisibility,
    })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  const isOwnerView = viewerId === userId;
  // Effective audience combines the lock toggle and the profileVisibility
  // setting. "only_me" hides details from everyone but the owner; "friends"
  // (or an enabled lock) hides them from non-friends.
  const audience: "public" | "friends" | "only_me" = !settingsRow
    ? "public"
    : settingsRow.profileVisibility === "only_me"
      ? "only_me"
      : settingsRow.isLocked || settingsRow.profileVisibility === "friends"
        ? "friends"
        : "public";
  const restricted =
    !isOwnerView &&
    (audience === "only_me" || (audience === "friends" && !viewerIsFriend));
  // Restricted viewer: hide intro/bio details. Posts/friends are already
  // excluded by the /users/:id/posts and /users/:id/friends routes. Surface
  // the restriction via `isLocked` so both clients render the locked state.
  const includeIntro = !restricted;
  const isLocked = isOwnerView ? Boolean(settingsRow?.isLocked) : restricted;

  return {
    ...toProfile(row, isOwnerView, includeIntro),
    friendCount: friends?.value ?? 0,
    followerCount: followers?.value ?? 0,
    followingCount: following?.value ?? 0,
    postCount: posts?.value ?? 0,
    viewerIsFriend,
    viewerHasPendingRequest,
    viewerFollows,
    viewerCanSendRequest,
    isLocked,
  };
}

// ---------------- Posts ----------------
export async function buildPosts(rows: PostRow[], viewerId?: string) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorMap = await loadProfileMap(rows.map((r) => r.authorId));
  const pageMap = await loadPageRefMap(rows.map((r) => r.pageId));

  const [
    mediaRows,
    reactRows,
    viewerReacts,
    commentCounts,
    shareCounts,
    viewerSaves,
    pollRows,
  ] = await Promise.all([
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
      viewerId
        ? db
            .select({ entityId: savedItemsTable.entityId })
            .from(savedItemsTable)
            .where(
              and(
                eq(savedItemsTable.userId, viewerId),
                eq(savedItemsTable.entityType, "post"),
                inArray(savedItemsTable.entityId, ids),
              ),
            )
        : Promise.resolve([]),
      db
        .select()
        .from(pollsTable)
        .where(inArray(pollsTable.postId, ids)),
    ]);

  // Load poll options + vote tallies + the viewer's own vote for any polls
  // attached to these posts, then group everything by post id.
  const pollIds = pollRows.map((p) => p.id);
  const [optionRows, voteCountRows, viewerVoteRows] = await Promise.all([
    pollIds.length
      ? db
          .select()
          .from(pollOptionsTable)
          .where(inArray(pollOptionsTable.pollId, pollIds))
          .orderBy(asc(pollOptionsTable.position))
      : Promise.resolve([]),
    pollIds.length
      ? db
          .select({ optionId: pollVotesTable.optionId, value: count() })
          .from(pollVotesTable)
          .where(inArray(pollVotesTable.pollId, pollIds))
          .groupBy(pollVotesTable.optionId)
      : Promise.resolve([]),
    viewerId && pollIds.length
      ? db
          .select({
            pollId: pollVotesTable.pollId,
            optionId: pollVotesTable.optionId,
          })
          .from(pollVotesTable)
          .where(
            and(
              inArray(pollVotesTable.pollId, pollIds),
              eq(pollVotesTable.userId, viewerId),
            ),
          )
      : Promise.resolve([]),
  ]);
  const voteCountByOption = new Map(
    voteCountRows.map((v) => [v.optionId, v.value]),
  );
  const viewerVoteByPoll = new Map(
    viewerVoteRows.map((v) => [v.pollId, v.optionId]),
  );
  const optionsByPoll = new Map<number, typeof optionRows>();
  for (const o of optionRows) {
    const list = optionsByPoll.get(o.pollId) ?? [];
    list.push(o);
    optionsByPoll.set(o.pollId, list);
  }
  const pollByPost = new Map<number, ReturnType<typeof toPoll>>();
  function toPoll(poll: (typeof pollRows)[number]) {
    const options = (optionsByPoll.get(poll.id) ?? []).map((o) => ({
      id: o.id,
      text: o.text,
      voteCount: voteCountByOption.get(o.id) ?? 0,
    }));
    return {
      id: poll.id,
      question: poll.question,
      totalVotes: options.reduce((sum, o) => sum + o.voteCount, 0),
      viewerVotedOptionId: viewerVoteByPoll.get(poll.id) ?? null,
      options,
    };
  }
  for (const poll of pollRows) pollByPost.set(poll.postId, toPoll(poll));

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
  const savedPostSet = new Set(viewerSaves.map((s) => s.entityId));

  return rows.map((row) => {
    const summary = reactByPost.get(row.id) ?? { total: 0, byType: {} };
    return {
      id: row.id,
      author: authorMap.get(row.authorId)!,
      authorPage: row.pageId != null ? (pageMap.get(row.pageId) ?? null) : null,
      content: row.content,
      feelingVerb: row.feelingVerb,
      feeling: row.feeling,
      feelingEmoji: row.feelingEmoji,
      location: row.location,
      privacy: row.privacy,
      commentsEnabled: row.commentsEnabled,
      reactionsEnabled: row.reactionsEnabled,
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
      viewerHasSaved: savedPostSet.has(row.id),
      poll: pollByPost.get(row.id) ?? null,
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

export async function buildPollByPostId(postId: number, viewerId?: string) {
  const [post] = await buildPosts(
    await db.select().from(postsTable).where(eq(postsTable.id, postId)),
    viewerId,
  );
  return post?.poll ?? null;
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
  const pageMap = await loadPageRefMap(rows.map((r) => r.pageId));
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
    authorPage: row.pageId != null ? (pageMap.get(row.pageId) ?? null) : null,
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
  // Story-reply embeds: load referenced stories + their authors so the
  // chat renders a story preview above the message (Facebook-style).
  const storyIds = [
    ...new Set(rows.map((r) => r.storyId).filter((v): v is number => v != null)),
  ];
  const storyById = new Map<number, StoryRow>();
  const storyAuthorMap =
    storyIds.length > 0
      ? await (async () => {
          const storyRows = await db
            .select()
            .from(storiesTable)
            .where(inArray(storiesTable.id, storyIds));
          for (const s of storyRows) storyById.set(s.id, s);
          return loadProfileMap(storyRows.map((s) => s.authorId));
        })()
      : new Map();
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
    story:
      row.storyId != null
        ? (() => {
            const s = storyById.get(row.storyId);
            if (!s) {
              return {
                id: row.storyId,
                storyType: "media" as const,
                mediaUrl: null,
                mediaType: null,
                textContent: null,
                backgroundStyle: null,
                authorName: null,
                expired: true,
              };
            }
            const a = storyAuthorMap.get(s.authorId);
            return {
              id: s.id,
              storyType: s.storyType as "media" | "text",
              mediaUrl: s.mediaUrl,
              mediaType: s.mediaType,
              textContent: s.textContent,
              backgroundStyle: s.backgroundStyle,
              authorName: a?.displayName ?? null,
              expired: new Date(s.expiresAt).getTime() < Date.now(),
            };
          })()
        : null,
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
      const clearedBefore = viewerMember?.clearedBeforeId ?? 0;
      const [unread] = await db
        .select({ value: count() })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, row.id),
            ne(messagesTable.senderId, viewerId),
            gt(
              messagesTable.id,
              Math.max(viewerMember?.lastReadMessageId ?? 0, clearedBefore),
            ),
          ),
        );
      // Hide the last message preview if the viewer cleared the chat after it.
      const last = builtLastByConv.get(row.id) ?? null;
      const visibleLast = last && last.id <= clearedBefore ? null : last;
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
        lastMessage: visibleLast,
        unreadCount: unread?.value ?? 0,
        isPinned: viewerMember?.isPinned ?? false,
        isArchived: viewerMember?.isArchived ?? false,
        isMuted: viewerMember?.isMuted ?? false,
        markedUnread: viewerMember?.markedUnread ?? false,
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
  const [[members], viewerRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, row.id),
          eq(groupMembersTable.status, "active"),
        ),
      ),
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
  const viewerRow = Array.isArray(viewerRows) ? viewerRows[0] : undefined;
  const viewerStatus = viewerRow?.status ?? "none";
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    privacy: row.privacy,
    rules: row.rules,
    requirePostApproval: row.requirePostApproval,
    joinQuestions: row.joinQuestions ?? null,
    pinnedPostId: row.pinnedPostId,
    memberCount: members?.value ?? 0,
    viewerIsMember: viewerStatus === "active",
    viewerStatus,
    viewerRole: viewerStatus === "active" ? (viewerRow?.role ?? null) : null,
    viewerIsMuted: viewerRow?.isMuted ?? false,
    createdAt: row.createdAt,
  };
}

// Serialize group_members rows (members list / join-request queue) with the
// member's profile attached.
export async function buildGroupMembers(
  rows: (typeof groupMembersTable.$inferSelect)[],
) {
  if (rows.length === 0) return [];
  const map = await loadProfileMap(rows.map((r) => r.userId));
  return rows.flatMap((r) => {
    const user = map.get(r.userId);
    if (!user) return [];
    return [
      {
        user,
        role: r.role,
        status: r.status,
        isMuted: r.isMuted,
        answers: r.answers ?? null,
        joinedAt: r.joinedAt,
      },
    ];
  });
}

// ---------------- Pages ----------------
export async function buildPage(
  row: PageRow,
  viewerId?: string,
  // When the viewer is acting AS a page, viewerFollows reflects whether that
  // acting page (not the user) follows this page.
  actingPageId?: number,
) {
  const [
    [followers],
    [followingRow],
    viewerRow,
    [stats],
    viewerReviewRows,
    memberRow,
    actingFollowRow,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(pageFollowersTable)
      .where(eq(pageFollowersTable.pageId, row.id)),
    db
      .select({ value: count() })
      .from(pageFollowingTable)
      .where(eq(pageFollowingTable.pageId, row.id)),
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
    db
      .select({ cnt: count(), average: avg(pageReviewsTable.rating) })
      .from(pageReviewsTable)
      .where(eq(pageReviewsTable.pageId, row.id)),
    viewerId
      ? db
          .select()
          .from(pageReviewsTable)
          .where(
            and(
              eq(pageReviewsTable.pageId, row.id),
              eq(pageReviewsTable.userId, viewerId),
            ),
          )
      : Promise.resolve([]),
    viewerId
      ? db
          .select()
          .from(pageMembersTable)
          .where(
            and(
              eq(pageMembersTable.pageId, row.id),
              eq(pageMembersTable.userId, viewerId),
            ),
          )
      : Promise.resolve([]),
    actingPageId
      ? db
          .select()
          .from(pageFollowingTable)
          .where(
            and(
              eq(pageFollowingTable.pageId, actingPageId),
              eq(pageFollowingTable.targetPageId, row.id),
            ),
          )
      : Promise.resolve([]),
  ]);
  const vr = Array.isArray(viewerReviewRows) ? viewerReviewRows[0] : undefined;
  const viewerReview = vr ? ((await buildPageReviews([vr]))[0] ?? null) : null;
  // The page owner and anyone granted Page access may manage/post as the page.
  const viewerCanPost = Boolean(
    viewerId && (viewerId === row.createdBy || memberRow.length > 0),
  );
  const viewerFollows = actingPageId
    ? Array.isArray(actingFollowRow) && actingFollowRow.length > 0
    : Array.isArray(viewerRow)
      ? viewerRow.length > 0
      : false;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    website: row.website,
    address: row.address,
    hours: row.hours,
    ctaType: row.ctaType,
    ctaUrl: row.ctaUrl,
    ownerId: row.createdBy,
    followerCount: followers?.value ?? 0,
    followingCount: followingRow?.value ?? 0,
    reviewCount: stats?.cnt ?? 0,
    averageRating: stats?.average != null ? Number(stats.average) : null,
    reviewsEnabled: row.reviewsEnabled,
    viewerFollows,
    viewerCanPost,
    // Anyone signed in who does NOT manage the page may leave a review, but
    // only while reviews are enabled. Owners/editors can't review their own page.
    viewerCanReview: Boolean(viewerId && !viewerCanPost && row.reviewsEnabled),
    viewerReview,
    createdAt: row.createdAt,
  };
}

// Serialize page_members rows (Page access list) with the member's profile.
export async function buildPageMembers(
  rows: (typeof pageMembersTable.$inferSelect)[],
) {
  if (rows.length === 0) return [];
  const map = await loadProfileMap(rows.map((r) => r.userId));
  return rows.flatMap((r) => {
    const user = map.get(r.userId);
    if (!user) return [];
    return [
      {
        id: r.id,
        user,
        role: r.role,
        createdAt: r.createdAt,
      },
    ];
  });
}

export async function buildPageReviews(
  rows: (typeof pageReviewsTable.$inferSelect)[],
) {
  if (rows.length === 0) return [];
  const map = await loadProfileMap(rows.map((r) => r.userId));
  return rows.flatMap((r) => {
    const user = map.get(r.userId);
    if (!user) return [];
    return [
      {
        id: r.id,
        user,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt,
      },
    ];
  });
}

// ---------------- Stories ----------------
export async function buildStoryGroups(viewerId: string) {
  const now = new Date();
  const allRows = await db
    .select()
    .from(storiesTable)
    .where(gt(storiesTable.expiresAt, now))
    .orderBy(asc(storiesTable.createdAt));
  // Enforce audience: only stories this viewer is allowed to see (author's
  // profile audience + the story's own public/friends/private setting).
  const rows = await filterVisibleStories(allRows, viewerId);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorMap = await loadProfileMap(rows.map((r) => r.authorId));
  const pageMap = await loadPageRefMap(rows.map((r) => r.pageId));
  const [viewRows, viewCounts, reactCounts, viewerReactRows] =
    await Promise.all([
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
      db
        .select({ storyId: storyReactionsTable.storyId, value: count() })
        .from(storyReactionsTable)
        .where(inArray(storyReactionsTable.storyId, ids))
        .groupBy(storyReactionsTable.storyId),
      db
        .select()
        .from(storyReactionsTable)
        .where(
          and(
            inArray(storyReactionsTable.storyId, ids),
            eq(storyReactionsTable.userId, viewerId),
          ),
        ),
    ]);
  const viewedSet = new Set(viewRows.map((v) => v.storyId));
  const viewCountByStory = new Map(viewCounts.map((v) => [v.storyId, v.value]));
  const reactCountByStory = new Map(reactCounts.map((v) => [v.storyId, v.value]));
  const viewerReactByStory = new Map(
    viewerReactRows.map((v) => [v.storyId, v.type]),
  );

  // Stories authored AS a page cluster under the page identity; otherwise
  // they group under the user who posted them.
  const byKey = new Map<string, StoryRow[]>();
  for (const s of rows) {
    const key = s.pageId != null ? `page:${s.pageId}` : `user:${s.authorId}`;
    const list = byKey.get(key) ?? [];
    list.push(s);
    byKey.set(key, list);
  }
  return [...byKey.values()].map((stories) => {
    const first = stories[0];
    const groupPage =
      first.pageId != null ? (pageMap.get(first.pageId) ?? null) : null;
    return {
      author: authorMap.get(first.authorId)!,
      authorPage: groupPage,
      stories: stories.map((s) => ({
        id: s.id,
        author: authorMap.get(s.authorId)!,
        authorPage: s.pageId != null ? (pageMap.get(s.pageId) ?? null) : null,
        pageId: s.pageId,
        storyType: s.storyType,
        audience: s.audience,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        textContent: s.textContent,
        backgroundStyle: s.backgroundStyle,
        musicUrl: s.musicUrl,
        musicTitle: s.musicTitle,
        musicArtist: s.musicArtist,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        viewCount: viewCountByStory.get(s.id) ?? 0,
        viewerHasViewed: viewedSet.has(s.id),
        reactionCount: reactCountByStory.get(s.id) ?? 0,
        viewerReaction: viewerReactByStory.get(s.id) ?? null,
      })),
      hasUnseen: stories.some((s) => !viewedSet.has(s.id)),
    };
  });
}

export function toStory(
  s: StoryRow,
  author: ReturnType<typeof toProfile>,
  viewCount = 0,
  viewerHasViewed = false,
  authorPage: PageRefDto | null = null,
  reactionCount = 0,
  viewerReaction: string | null = null,
) {
  return {
    id: s.id,
    author,
    authorPage,
    pageId: s.pageId,
    storyType: s.storyType,
    audience: s.audience,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType,
    caption: s.caption,
    textContent: s.textContent,
    backgroundStyle: s.backgroundStyle,
    musicUrl: s.musicUrl,
    musicTitle: s.musicTitle,
    musicArtist: s.musicArtist,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    viewCount,
    viewerHasViewed,
    reactionCount,
    viewerReaction,
  };
}

// Build a single story with reaction + view counts for the given viewer.
export async function buildStoryById(id: number, viewerId: string) {
  const [s] = await db.select().from(storiesTable).where(eq(storiesTable.id, id));
  if (!s) return null;
  // Never return a story the viewer isn't allowed to see, even by direct id.
  if (!(await canViewStory(s, viewerId))) return null;
  const [author] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, s.authorId));
  const pageMap = await loadPageRefMap([s.pageId]);
  const [viewCountRows, reactCountRows, viewerViewRows, viewerReactRows] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(storyViewsTable)
        .where(eq(storyViewsTable.storyId, id)),
      db
        .select({ value: count() })
        .from(storyReactionsTable)
        .where(eq(storyReactionsTable.storyId, id)),
      db
        .select()
        .from(storyViewsTable)
        .where(
          and(
            eq(storyViewsTable.storyId, id),
            eq(storyViewsTable.viewerId, viewerId),
          ),
        ),
      db
        .select()
        .from(storyReactionsTable)
        .where(
          and(
            eq(storyReactionsTable.storyId, id),
            eq(storyReactionsTable.userId, viewerId),
          ),
        ),
    ]);
  return toStory(
    s,
    toProfile(author),
    viewCountRows[0]?.value ?? 0,
    viewerViewRows.length > 0,
    s.pageId != null ? (pageMap.get(s.pageId) ?? null) : null,
    reactCountRows[0]?.value ?? 0,
    viewerReactRows[0]?.type ?? null,
  );
}

// ---------------- Reels ----------------
export async function buildReels(rows: ReelRow[], viewerId?: string) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorMap = await loadProfileMap(rows.map((r) => r.authorId));
  const [likeCounts, viewerLikes, commentCounts, viewerSaves] = await Promise.all([
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
    viewerId
      ? db
          .select({ entityId: savedItemsTable.entityId })
          .from(savedItemsTable)
          .where(
            and(
              eq(savedItemsTable.userId, viewerId),
              eq(savedItemsTable.entityType, "reel"),
              inArray(savedItemsTable.entityId, ids),
            ),
          )
      : Promise.resolve([]),
  ]);
  const likeCountByReel = new Map(likeCounts.map((l) => [l.reelId, l.value]));
  const likedSet = new Set(viewerLikes.map((l) => l.reelId));
  const viewerReactionByReel = new Map(viewerLikes.map((l) => [l.reelId, l.type]));
  const commentCountByReel = new Map(commentCounts.map((c) => [c.reelId, c.value]));
  const savedReelSet = new Set(viewerSaves.map((s) => s.entityId));
  return rows.map((row) => ({
    id: row.id,
    author: authorMap.get(row.authorId)!,
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    caption: row.caption,
    musicUrl: row.musicUrl,
    musicTitle: row.musicTitle,
    musicArtist: row.musicArtist,
    createdAt: row.createdAt,
    likeCount: likeCountByReel.get(row.id) ?? 0,
    commentCount: commentCountByReel.get(row.id) ?? 0,
    viewerHasLiked: likedSet.has(row.id),
    viewerHasSaved: savedReelSet.has(row.id),
    viewerReaction: viewerReactionByReel.get(row.id) ?? null,
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
// ---------------- Marketplace ----------------
export async function buildListings(
  rows: MarketplaceListingRow[],
  viewerId?: string,
  distances?: Map<number, number>,
) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [profiles, viewerSaves] = await Promise.all([
    loadProfileMap(rows.map((r) => r.sellerId)),
    viewerId
      ? db
          .select({ entityId: savedItemsTable.entityId })
          .from(savedItemsTable)
          .where(
            and(
              eq(savedItemsTable.userId, viewerId),
              eq(savedItemsTable.entityType, "listing"),
              inArray(savedItemsTable.entityId, ids),
            ),
          )
      : Promise.resolve([]),
  ]);
  const savedSet = new Set(viewerSaves.map((s) => s.entityId));
  return rows
    .map((r) => {
      const seller = profiles.get(r.sellerId);
      if (!seller) return null;
      return {
        id: r.id,
        seller,
        title: r.title,
        price: r.price,
        currency: r.currency,
        category: r.category,
        condition: r.condition,
        description: r.description,
        location: r.location,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        distanceKm: distances?.get(r.id) ?? null,
        photos: r.photos ?? [],
        status: r.status,
        viewerIsSeller: viewerId ? r.sellerId === viewerId : false,
        viewerHasSaved: savedSet.has(r.id),
        createdAt: r.createdAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ---------------- Saved items ----------------
export async function buildSavedItems(
  rows: { id: number; entityType: string; entityId: number; createdAt: Date }[],
  viewerId: string,
) {
  if (rows.length === 0) return [];
  const postIds = rows
    .filter((r) => r.entityType === "post")
    .map((r) => r.entityId);
  const listingIds = rows
    .filter((r) => r.entityType === "listing")
    .map((r) => r.entityId);
  const reelIds = rows
    .filter((r) => r.entityType === "reel")
    .map((r) => r.entityId);

  const [postRowsRaw, listingRows, reelRowsRaw] = await Promise.all([
    postIds.length
      ? db.select().from(postsTable).where(inArray(postsTable.id, postIds))
      : Promise.resolve([]),
    listingIds.length
      ? db
          .select()
          .from(marketplaceListingsTable)
          .where(inArray(marketplaceListingsTable.id, listingIds))
      : Promise.resolve([]),
    reelIds.length
      ? db.select().from(reelsTable).where(inArray(reelsTable.id, reelIds))
      : Promise.resolve([]),
  ]);

  // Re-check visibility at read time: a post/reel saved earlier may now be
  // hidden (e.g. its author locked their profile, or changed privacy). Without
  // this a non-friend could keep retrieving a locked user's content via stale
  // saved IDs.
  const postVisibility = await Promise.all(
    postRowsRaw.map((p) => canViewPost(p, viewerId)),
  );
  const postRows = postRowsRaw.filter((_, i) => postVisibility[i]);
  const reelVisibility = await Promise.all(
    reelRowsRaw.map((r) => canViewReel(r.authorId, viewerId)),
  );
  const reelRows = reelRowsRaw.filter((_, i) => reelVisibility[i]);

  const [builtPosts, builtListings, builtReels] = await Promise.all([
    buildPosts(postRows, viewerId),
    buildListings(listingRows, viewerId),
    buildReels(reelRows, viewerId),
  ]);
  const postMap = new Map(builtPosts.map((p) => [p.id, p]));
  const listingMap = new Map(builtListings.map((l) => [l.id, l]));
  const reelMap = new Map(builtReels.map((r) => [r.id, r]));

  return rows
    .map((r) => {
      const post = r.entityType === "post" ? (postMap.get(r.entityId) ?? null) : null;
      const listing =
        r.entityType === "listing" ? (listingMap.get(r.entityId) ?? null) : null;
      const reel = r.entityType === "reel" ? (reelMap.get(r.entityId) ?? null) : null;
      // Skip saved rows whose underlying entity was deleted.
      if (!post && !listing && !reel) return null;
      return {
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        post,
        listing,
        reel,
        createdAt: r.createdAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function buildListingById(id: number, viewerId?: string) {
  const [row] = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id));
  if (!row) return null;
  const [built] = await buildListings([row], viewerId);
  return built ?? null;
}

export { and, eq, ne, or, gt, inArray, desc, asc, count, isNull };
