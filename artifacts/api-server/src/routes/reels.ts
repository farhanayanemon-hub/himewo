import { Router, type IRouter } from "express";
import {
  db,
  profilesTable,
  reelsTable,
  reelLikesTable,
  reelCommentsTable,
} from "@workspace/db";
import { and, eq, lt, asc, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { toProfile, buildReels, buildReelById } from "../lib/serialize";
import { shareMusicToLibrary } from "./stories";
import { createNotification } from "../lib/notify";
import {
  ListReelsQueryParams,
  ListReelsResponse,
  CreateReelBody,
  CreateReelResponse,
  GetReelParams,
  GetReelResponse,
  LikeReelParams,
  LikeReelResponse,
  UnlikeReelParams,
  UnlikeReelResponse,
  SetReelReactionParams,
  SetReelReactionBody,
  SetReelReactionResponse,
  RemoveReelReactionParams,
  RemoveReelReactionResponse,
  ListReelCommentsParams,
  ListReelCommentsResponse,
  CreateReelCommentParams,
  CreateReelCommentBody,
  CreateReelCommentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reels", requireAuth, async (req, res): Promise<void> => {
  const query = ListReelsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { cursor, limit } = query.data;
  const rows = await db
    .select()
    .from(reelsTable)
    .where(cursor ? lt(reelsTable.id, cursor) : undefined)
    .orderBy(desc(reelsTable.id))
    .limit(limit ?? 10);
  const built = await buildReels(rows, req.userId);
  res.json(ListReelsResponse.parse(built));
});

router.post("/reels", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [reel] = await db
    .insert(reelsTable)
    .values({
      authorId: req.userId!,
      videoUrl: parsed.data.videoUrl,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      caption: parsed.data.caption ?? null,
      musicUrl: parsed.data.musicUrl ?? null,
      musicTitle: parsed.data.musicTitle ?? null,
      musicArtist: parsed.data.musicArtist ?? null,
    })
    .returning();
  // Posted music becomes shared in the library.
  await shareMusicToLibrary(
    parsed.data.musicUrl,
    parsed.data.musicTitle,
    parsed.data.musicArtist,
  );
  const built = await buildReelById(reel.id, req.userId);
  res.status(201).json(CreateReelResponse.parse(built));
});

router.get("/reels/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const built = await buildReelById(params.data.id, req.userId);
  if (!built) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  res.json(GetReelResponse.parse(built));
});

const likeReelHandler = async (
  req: Parameters<Parameters<typeof router.put>[1]>[0],
  res: Parameters<Parameters<typeof router.put>[1]>[1],
): Promise<void> => {
  const params = LikeReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [reel] = await db
    .select()
    .from(reelsTable)
    .where(eq(reelsTable.id, params.data.id));
  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  await db
    .insert(reelLikesTable)
    .values({ reelId: params.data.id, userId: req.userId! })
    .onConflictDoNothing();
  await createNotification({
    userId: reel.authorId,
    actorId: req.userId!,
    type: "reaction",
    entityType: "reel",
    entityId: reel.id,
  });
  const built = await buildReelById(params.data.id, req.userId);
  res.json(LikeReelResponse.parse(built));
};

router.put("/reels/:id/like", requireAuth, likeReelHandler);
router.post("/reels/:id/like", requireAuth, likeReelHandler);

router.delete(
  "/reels/:id/like",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UnlikeReelParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(reelLikesTable)
      .where(
        and(
          eq(reelLikesTable.reelId, params.data.id),
          eq(reelLikesTable.userId, req.userId!),
        ),
      );
    const built = await buildReelById(params.data.id, req.userId);
    if (!built) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    res.json(UnlikeReelResponse.parse(built));
  },
);

router.put(
  "/reels/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetReelReactionParams.safeParse(req.params);
    const parsed = SetReelReactionBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [reel] = await db
      .select()
      .from(reelsTable)
      .where(eq(reelsTable.id, params.data.id));
    if (!reel) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    await db
      .insert(reelLikesTable)
      .values({
        reelId: params.data.id,
        userId: req.userId!,
        type: parsed.data.type,
      })
      .onConflictDoUpdate({
        target: [reelLikesTable.reelId, reelLikesTable.userId],
        set: { type: parsed.data.type },
      });
    await createNotification({
      userId: reel.authorId,
      actorId: req.userId!,
      type: "reaction",
      entityType: "reel",
      entityId: reel.id,
    });
    const built = await buildReelById(params.data.id, req.userId);
    res.json(SetReelReactionResponse.parse(built));
  },
);

router.delete(
  "/reels/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveReelReactionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(reelLikesTable)
      .where(
        and(
          eq(reelLikesTable.reelId, params.data.id),
          eq(reelLikesTable.userId, req.userId!),
        ),
      );
    const built = await buildReelById(params.data.id, req.userId);
    if (!built) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    res.json(RemoveReelReactionResponse.parse(built));
  },
);

router.get(
  "/reels/:id/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListReelCommentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(reelCommentsTable)
      .where(eq(reelCommentsTable.reelId, params.data.id))
      .orderBy(asc(reelCommentsTable.id));
    const authorIds = [...new Set(rows.map((r) => r.authorId))];
    const profiles =
      authorIds.length > 0
        ? await db
            .select()
            .from(profilesTable)
            .where(inArray(profilesTable.id, authorIds))
        : [];
    const map = new Map(profiles.map((p) => [p.id, toProfile(p)]));
    const result = rows.map((r) => ({
      id: r.id,
      reelId: r.reelId,
      author: map.get(r.authorId)!,
      content: r.content,
      createdAt: r.createdAt,
    }));
    res.json(ListReelCommentsResponse.parse(result));
  },
);

router.post(
  "/reels/:id/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateReelCommentParams.safeParse(req.params);
    const parsed = CreateReelCommentBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [reel] = await db
      .select()
      .from(reelsTable)
      .where(eq(reelsTable.id, params.data.id));
    if (!reel) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    const [comment] = await db
      .insert(reelCommentsTable)
      .values({
        reelId: params.data.id,
        authorId: req.userId!,
        content: parsed.data.content,
      })
      .returning();
    await createNotification({
      userId: reel.authorId,
      actorId: req.userId!,
      type: "comment",
      entityType: "reel",
      entityId: reel.id,
    });
    const [author] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!));
    res.status(201).json(
      CreateReelCommentResponse.parse({
        id: comment.id,
        reelId: comment.reelId,
        author: toProfile(author),
        content: comment.content,
        createdAt: comment.createdAt,
      }),
    );
  },
);

export default router;
