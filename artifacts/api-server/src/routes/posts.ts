import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  postMediaTable,
  postReactionsTable,
  commentsTable,
  sharesTable,
  pollsTable,
  pollOptionsTable,
  pollVotesTable,
  profilesTable,
  friendshipsTable,
  userSettingsTable,
  groupMembersTable,
  groupsTable,
  pagesTable,
} from "@workspace/db";
import { and, or, eq, ne, lt, asc, desc, inArray, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  toProfile,
  buildPosts,
  buildPostById,
  buildPollByPostId,
  buildReactionSummary,
  buildComments,
  buildCommentById,
} from "../lib/serialize";
import { createNotification } from "../lib/notify";
import { awardPoints } from "../lib/earnings";
import { canViewPost, filterVisiblePosts } from "../lib/authz";
import {
  GetFeedQueryParams,
  GetFeedResponse,
  CreatePostBody,
  CreatePostResponse,
  GetPostParams,
  GetPostResponse,
  UpdatePostParams,
  UpdatePostBody,
  UpdatePostResponse,
  DeletePostParams,
  SetPostReactionParams,
  SetPostReactionBody,
  SetPostReactionResponse,
  RemovePostReactionParams,
  RemovePostReactionResponse,
  ListPostReactionsParams,
  ListPostReactionsResponse,
  SharePostParams,
  SharePostBody,
  SharePostResponse,
  VotePollParams,
  VotePollBody,
  VotePollResponse,
  RemovePollVoteParams,
  RemovePollVoteResponse,
  ListCommentsParams,
  ListCommentsQueryParams,
  ListCommentsResponse,
  CreateCommentParams,
  CreateCommentBody,
  CreateCommentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/feed", requireAuth, async (req, res): Promise<void> => {
  const query = GetFeedQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const viewer = req.userId!;
  const { cursor, limit } = query.data;
  const friends = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        eq(friendshipsTable.userAId, viewer),
        eq(friendshipsTable.userBId, viewer),
      ),
    );
  const friendIds = friends.map((f) =>
    f.userAId === viewer ? f.userBId : f.userAId,
  );
  const visibleAuthors = [viewer, ...friendIds];
  const rows = await db
    .select()
    .from(postsTable)
    .where(
      and(
        isNull(postsTable.groupId),
        or(
          eq(postsTable.privacy, "public"),
          inArray(postsTable.authorId, visibleAuthors),
        ),
        cursor ? lt(postsTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(postsTable.id))
    .limit(limit ?? 20);
  // The SQL above is a coarse net (public OR self/friend authored). Run every
  // row through the shared visibility policy so the author's effective audience
  // (lock / profileVisibility incl. only_me) AND per-post privacy are honored —
  // e.g. a friend's only_me or private posts must never leak into the feed.
  const visibleRows = await filterVisiblePosts(rows, viewer);
  const posts = await buildPosts(visibleRows, viewer);
  res.json(GetFeedResponse.parse(posts));
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { content, privacy, groupId, pageId, media, poll } = parsed.data;
  const feelingVerb = parsed.data.feelingVerb?.trim() || null;
  const feeling = parsed.data.feeling?.trim() || null;
  const feelingEmoji = parsed.data.feelingEmoji?.trim() || null;
  const location = parsed.data.location?.trim() || null;
  // A poll needs a question and at least two non-empty options.
  const pollOptions = poll?.options
    ?.map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (poll && (!poll.question.trim() || !pollOptions || pollOptions.length < 2)) {
    res
      .status(400)
      .json({ error: "A poll needs a question and at least two options." });
    return;
  }
  // Authorize group/page posting before writing. Group posts require the author
  // to be a member; page posts require the author to own the page. Otherwise a
  // client could post into any community by passing an arbitrary id.
  let pendingApproval = false;
  if (groupId != null) {
    const [membership] = await db
      .select({
        role: groupMembersTable.role,
        status: groupMembersTable.status,
        isMuted: groupMembersTable.isMuted,
      })
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId!),
        ),
      );
    if (!membership || membership.status !== "active") {
      res
        .status(403)
        .json({ error: "You must be a member of this group to post." });
      return;
    }
    if (membership.isMuted) {
      res.status(403).json({ error: "You are muted in this group." });
      return;
    }
    const [group] = await db
      .select({ requirePostApproval: groupsTable.requirePostApproval })
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId));
    // Regular members' posts wait for approval when the group requires it;
    // admins and moderators bypass the queue.
    if (group?.requirePostApproval && membership.role === "member") {
      pendingApproval = true;
    }
  }
  if (pageId != null) {
    const [page] = await db
      .select({ createdBy: pagesTable.createdBy })
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));
    if (!page) {
      res.status(404).json({ error: "Page not found" });
      return;
    }
    if (page.createdBy !== req.userId) {
      res
        .status(403)
        .json({ error: "Only the page owner can post as this page." });
      return;
    }
  }
  // Resolve the audience for a new timeline post. An explicit `privacy` wins;
  // otherwise apply the user's "Default audience for new posts" setting
  // (postVisibility). Group/page posts keep "public" since their reach is
  // governed by group membership / page followers, not the author's default.
  let effectivePrivacy: "public" | "friends" | "private" = privacy ?? "public";
  if (!privacy && groupId == null && pageId == null) {
    const [settings] = await db
      .select({ postVisibility: userSettingsTable.postVisibility })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, req.userId!));
    const pv = settings?.postVisibility ?? "public";
    effectivePrivacy =
      pv === "only_me" ? "private" : pv === "friends" ? "friends" : "public";
  }
  const [post] = await db
    .insert(postsTable)
    .values({
      authorId: req.userId!,
      content,
      feelingVerb,
      feeling,
      feelingEmoji,
      location,
      privacy: effectivePrivacy,
      groupId: groupId ?? null,
      pageId: pageId ?? null,
      pendingApproval,
    })
    .returning();
  if (media && media.length > 0) {
    await db.insert(postMediaTable).values(
      media.map((m, i) => ({
        postId: post.id,
        url: m.url,
        type: m.type,
        thumbnailUrl: m.thumbnailUrl ?? null,
        width: m.width ?? null,
        height: m.height ?? null,
        durationMs: m.durationMs ?? null,
        position: m.position ?? i,
      })),
    );
  }
  if (poll && pollOptions) {
    const [createdPoll] = await db
      .insert(pollsTable)
      .values({ postId: post.id, question: poll.question.trim() })
      .returning();
    await db.insert(pollOptionsTable).values(
      pollOptions.map((text, i) => ({
        pollId: createdPoll.id,
        text,
        position: i,
      })),
    );
  }
  await awardPoints({
    userId: req.userId!,
    action: "post",
    entityType: "post",
    entityId: post.id,
    ip: req.ip,
  });
  const built = await buildPostById(post.id, req.userId);
  res.status(201).json(CreatePostResponse.parse(built));
});

async function loadVisiblePost(id: number, viewerId: string) {
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, id));
  if (!post) return null;
  if (!(await canViewPost(post, viewerId))) return null;
  return post;
}

router.get("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await loadVisiblePost(params.data.id, req.userId!))) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const post = await buildPostById(params.data.id, req.userId);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(GetPostResponse.parse(post));
});

router.patch("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePostParams.safeParse(req.params);
  const parsed = UpdatePostBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [existing] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (existing.authorId !== req.userId) {
    res.status(403).json({ error: "Not your post" });
    return;
  }
  await db
    .update(postsTable)
    .set(parsed.data)
    .where(eq(postsTable.id, params.data.id));
  const built = await buildPostById(params.data.id, req.userId);
  res.json(UpdatePostResponse.parse(built));
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (existing.authorId !== req.userId) {
    res.status(403).json({ error: "Not your post" });
    return;
  }
  await db.delete(postsTable).where(eq(postsTable.id, params.data.id));
  res.sendStatus(204);
});

router.put(
  "/posts/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetPostReactionParams.safeParse(req.params);
    const parsed = SetPostReactionBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [post] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, params.data.id));
    if (!post || !(await canViewPost(post, req.userId!))) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    if (!post.reactionsEnabled) {
      res.status(403).json({ error: "Reactions are turned off for this post" });
      return;
    }
    await db
      .insert(postReactionsTable)
      .values({
        postId: params.data.id,
        userId: req.userId!,
        type: parsed.data.type,
      })
      .onConflictDoUpdate({
        target: [postReactionsTable.postId, postReactionsTable.userId],
        set: { type: parsed.data.type },
      });
    await createNotification({
      userId: post.authorId,
      actorId: req.userId!,
      type: "reaction",
      entityType: "post",
      entityId: post.id,
    });
    await awardPoints({
      userId: req.userId!,
      action: "like",
      entityType: "post",
      entityId: post.id,
      contentOwnerId: post.authorId,
      ip: req.ip,
    });
    const summary = await buildReactionSummary(params.data.id, req.userId);
    res.json(SetPostReactionResponse.parse(summary));
  },
);

router.delete(
  "/posts/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemovePostReactionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!(await loadVisiblePost(params.data.id, req.userId!))) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    await db
      .delete(postReactionsTable)
      .where(
        and(
          eq(postReactionsTable.postId, params.data.id),
          eq(postReactionsTable.userId, req.userId!),
        ),
      );
    const summary = await buildReactionSummary(params.data.id, req.userId);
    res.json(RemovePostReactionResponse.parse(summary));
  },
);

router.put(
  "/posts/:id/poll/vote",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = VotePollParams.safeParse(req.params);
    const parsed = VotePollBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [post] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, params.data.id));
    if (!post || !(await canViewPost(post, req.userId!))) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const [poll] = await db
      .select()
      .from(pollsTable)
      .where(eq(pollsTable.postId, params.data.id));
    if (!poll) {
      res.status(404).json({ error: "This post has no poll" });
      return;
    }
    // The chosen option must belong to this poll — otherwise a client could
    // vote for an option from an unrelated poll.
    const [option] = await db
      .select()
      .from(pollOptionsTable)
      .where(
        and(
          eq(pollOptionsTable.id, parsed.data.optionId),
          eq(pollOptionsTable.pollId, poll.id),
        ),
      );
    if (!option) {
      res.status(400).json({ error: "Invalid poll option" });
      return;
    }
    await db
      .insert(pollVotesTable)
      .values({
        pollId: poll.id,
        optionId: option.id,
        userId: req.userId!,
      })
      .onConflictDoUpdate({
        target: [pollVotesTable.pollId, pollVotesTable.userId],
        set: { optionId: option.id },
      });
    const built = await buildPollByPostId(params.data.id, req.userId);
    res.json(VotePollResponse.parse(built));
  },
);

router.delete(
  "/posts/:id/poll/vote",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemovePollVoteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [poll] = await db
      .select()
      .from(pollsTable)
      .where(eq(pollsTable.postId, params.data.id));
    if (!poll) {
      res.status(404).json({ error: "This post has no poll" });
      return;
    }
    await db
      .delete(pollVotesTable)
      .where(
        and(
          eq(pollVotesTable.pollId, poll.id),
          eq(pollVotesTable.userId, req.userId!),
        ),
      );
    const built = await buildPollByPostId(params.data.id, req.userId);
    res.json(RemovePollVoteResponse.parse(built));
  },
);

router.get(
  "/posts/:id/reactions",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListPostReactionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!(await loadVisiblePost(params.data.id, req.userId!))) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const rows = await db
      .select()
      .from(postReactionsTable)
      .innerJoin(
        profilesTable,
        eq(postReactionsTable.userId, profilesTable.id),
      )
      .where(eq(postReactionsTable.postId, params.data.id));
    const result = rows.map((r) => ({
      user: toProfile(r.profiles),
      type: r.post_reactions.type,
    }));
    res.json(ListPostReactionsResponse.parse(result));
  },
);

router.post("/posts/:id/share", requireAuth, async (req, res): Promise<void> => {
  const params = SharePostParams.safeParse(req.params);
  const parsed = SharePostBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));
  if (!post || !(await canViewPost(post, req.userId!))) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const [share] = await db
    .insert(sharesTable)
    .values({
      postId: params.data.id,
      userId: req.userId!,
      caption: parsed.data.caption ?? null,
    })
    .returning();
  await createNotification({
    userId: post.authorId,
    actorId: req.userId!,
    type: "share",
    entityType: "post",
    entityId: post.id,
  });
  // Award per share (keyed by the share row), bounded by the daily cap — the
  // spec relies on the cap rather than once-per-post idempotency for shares.
  await awardPoints({
    userId: req.userId!,
    action: "share",
    entityType: "share",
    entityId: share.id,
    contentOwnerId: post.authorId,
    ip: req.ip,
  });
  const built = await buildPostById(params.data.id, req.userId);
  res.status(201).json(SharePostResponse.parse(built));
});

router.get(
  "/posts/:id/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListCommentsParams.safeParse(req.params);
    const query = ListCommentsQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!(await loadVisiblePost(params.data.id, req.userId!))) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const { cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.postId, params.data.id),
          cursor ? lt(commentsTable.id, cursor) : undefined,
        ),
      )
      .orderBy(asc(commentsTable.id))
      .limit(limit ?? 30);
    const comments = await buildComments(rows, req.userId);
    res.json(ListCommentsResponse.parse(comments));
  },
);

router.post(
  "/posts/:id/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateCommentParams.safeParse(req.params);
    const parsed = CreateCommentBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [post] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, params.data.id));
    if (!post || !(await canViewPost(post, req.userId!))) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    if (!post.commentsEnabled) {
      res.status(403).json({ error: "Comments are turned off for this post" });
      return;
    }
    // Stored-XSS guard: user-supplied media URLs must be plain http(s).
    if (
      parsed.data.mediaUrl &&
      !/^https?:\/\//i.test(parsed.data.mediaUrl)
    ) {
      res.status(400).json({ error: "Invalid media URL" });
      return;
    }
    if (!parsed.data.content.trim() && !parsed.data.mediaUrl) {
      res.status(400).json({ error: "Comment cannot be empty" });
      return;
    }
    const [comment] = await db
      .insert(commentsTable)
      .values({
        postId: params.data.id,
        authorId: req.userId!,
        parentId: parsed.data.parentId ?? null,
        content: parsed.data.content,
        mediaUrl: parsed.data.mediaUrl ?? null,
      })
      .returning();
    await createNotification({
      userId: post.authorId,
      actorId: req.userId!,
      type: "comment",
      entityType: "post",
      entityId: post.id,
    });
    if (parsed.data.parentId) {
      const [parent] = await db
        .select()
        .from(commentsTable)
        .where(eq(commentsTable.id, parsed.data.parentId));
      if (parent) {
        await createNotification({
          userId: parent.authorId,
          actorId: req.userId!,
          type: "comment",
          entityType: "comment",
          entityId: parent.id,
        });
      }
    }
    // Award per comment (keyed by the comment row), bounded by the daily cap,
    // plus a duplicate-text guard: only the first time a user uses a given
    // comment text earns — reposting identical text never farms points.
    const [dupe] = await db
      .select({ id: commentsTable.id })
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.authorId, req.userId!),
          eq(commentsTable.content, parsed.data.content),
          ne(commentsTable.id, comment.id),
        ),
      )
      .limit(1);
    if (!dupe) {
      await awardPoints({
        userId: req.userId!,
        action: "comment",
        entityType: "comment",
        entityId: comment.id,
        contentOwnerId: post.authorId,
        ip: req.ip,
      });
    }
    const built = await buildCommentById(comment.id, req.userId);
    res.status(201).json(CreateCommentResponse.parse(built));
  },
);

export default router;
