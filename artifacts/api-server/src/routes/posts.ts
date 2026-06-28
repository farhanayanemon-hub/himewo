import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  postMediaTable,
  postReactionsTable,
  commentsTable,
  sharesTable,
  profilesTable,
  friendshipsTable,
} from "@workspace/db";
import { and, or, eq, lt, asc, desc, inArray, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  toProfile,
  buildPosts,
  buildPostById,
  buildReactionSummary,
  buildComments,
  buildCommentById,
} from "../lib/serialize";
import { createNotification } from "../lib/notify";
import { canViewPost } from "../lib/authz";
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
  const posts = await buildPosts(rows, viewer);
  res.json(GetFeedResponse.parse(posts));
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { content, privacy, groupId, pageId, media } = parsed.data;
  const [post] = await db
    .insert(postsTable)
    .values({
      authorId: req.userId!,
      content,
      privacy: privacy ?? "public",
      groupId: groupId ?? null,
      pageId: pageId ?? null,
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
  const originalId = post.sharedPostId ?? params.data.id;
  await db.insert(sharesTable).values({
    postId: originalId,
    userId: req.userId!,
    caption: parsed.data.caption ?? null,
  });
  const [repost] = await db
    .insert(postsTable)
    .values({
      authorId: req.userId!,
      content: parsed.data.caption?.trim() ?? "",
      privacy: "public",
      sharedPostId: originalId,
    })
    .returning();
  await createNotification({
    userId: post.authorId,
    actorId: req.userId!,
    type: "share",
    entityType: "post",
    entityId: originalId,
  });
  const built = await buildPostById(repost.id, req.userId);
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
    const built = await buildCommentById(comment.id, req.userId);
    res.status(201).json(CreateCommentResponse.parse(built));
  },
);

export default router;
