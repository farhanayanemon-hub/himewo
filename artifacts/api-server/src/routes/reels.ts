import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  profilesTable,
  reelsTable,
  reelLikesTable,
  reelCommentsTable,
} from "@workspace/db";
import { and, eq, ne, lt, asc, desc, inArray, isNull, isNotNull, sql } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { requireAuth } from "../lib/auth";
import { resolveUserId } from "../lib/resolve-user";
import { filterVisibleReels, canViewReel } from "../lib/authz";
import { toProfile, buildReels, buildReelById } from "../lib/serialize";
import { shareMusicToLibrary } from "./stories";
import { createNotification } from "../lib/notify";
import { awardPoints } from "../lib/earnings";
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
  const authorRequested = "authorId" in req.query;
  let authorId = typeof req.query.authorId === "string" ? req.query.authorId.trim() : undefined;

  const pageLimit = limit ?? 10;

  // Auto-purge reels in trash older than 30 days in the background
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  db.delete(reelsTable)
    .where(
      and(
        isNotNull(reelsTable.deletedAt),
        lt(reelsTable.deletedAt, thirtyDaysAgo)
      )
    )
    .catch(() => {});

  if (authorRequested) {
    // Specific author's reels (e.g. Profile view) — NEVER fall back to general feed
    if (!authorId || authorId === "undefined" || authorId === "null") {
      res.json(ListReelsResponse.parse([]));
      return;
    }
    const resolvedAuthor = await resolveUserId(authorId);
    if (!resolvedAuthor) {
      res.json(ListReelsResponse.parse([]));
      return;
    }
    authorId = resolvedAuthor;

    const rows = await db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.authorId, authorId),
          isNull(reelsTable.deletedAt),
          cursor ? lt(reelsTable.id, cursor) : undefined
        )
      )
      .orderBy(desc(reelsTable.id))
      .limit(pageLimit);

    const vis = await filterVisibleReels(rows, req.userId!);
    const built = await buildReels(vis, req.userId);
    res.json(ListReelsResponse.parse(built));
    return;
  }

  // General feed scan
  const SCAN_BATCH = 50;
  const MAX_SCANS = 8;
  const visibleRows: (typeof reelsTable.$inferSelect)[] = [];
  let scanCursor = cursor;
  for (let i = 0; i < MAX_SCANS && visibleRows.length < pageLimit; i++) {
    const rows = await db
      .select()
      .from(reelsTable)
      .where(
        and(
          scanCursor ? lt(reelsTable.id, scanCursor) : undefined,
          isNull(reelsTable.deletedAt),
          eq(reelsTable.hidden, false)
        )
      )
      .orderBy(desc(reelsTable.id))
      .limit(SCAN_BATCH);
    if (rows.length === 0) break;
    scanCursor = rows[rows.length - 1]!.id;
    const vis = await filterVisibleReels(rows, req.userId!);
    visibleRows.push(...vis);
    if (rows.length < SCAN_BATCH) break;
  }
  const built = await buildReels(visibleRows.slice(0, pageLimit), req.userId);
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
  // Award 20 points for creating a reel (configurable via pointsPerReel)
  await awardPoints({
    userId: req.userId!,
    action: "reel",
    entityType: "reel",
    entityId: reel.id,
    ip: req.ip,
  });
  const built = await buildReelById(reel.id, req.userId);
  res.status(201).json(CreateReelResponse.parse(built));
});

router.get("/reels/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(reelsTable)
    .where(and(eq(reelsTable.id, params.data.id), isNull(reelsTable.deletedAt)));
  if (!row) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  const built = await buildReelById(params.data.id, req.userId);
  if (!built || !(await canViewReel(built.author.id, req.userId!))) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  res.json(GetReelResponse.parse(built));
});

// Edit reel caption (own reel only)
router.patch("/reels/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid reel id" });
    return;
  }
  const [reel] = await db
    .select()
    .from(reelsTable)
    .where(and(eq(reelsTable.id, id), isNull(reelsTable.deletedAt)));
  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  if (reel.authorId !== req.userId) {
    res.status(403).json({ error: "You can only edit your own reel" });
    return;
  }
  const caption = typeof req.body.caption === "string" ? req.body.caption : undefined;
  if (caption === undefined) {
    res.status(400).json({ error: "Caption is required" });
    return;
  }
  await db
    .update(reelsTable)
    .set({ caption })
    .where(eq(reelsTable.id, id));
  const built = await buildReelById(id, req.userId);
  res.json(built);
});

// Delete reel to trash (own reel only - auto-purged after 30 days)
router.delete("/reels/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid reel id" });
    return;
  }
  const [reel] = await db
    .select()
    .from(reelsTable)
    .where(and(eq(reelsTable.id, id), isNull(reelsTable.deletedAt)));
  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  if (reel.authorId !== req.userId) {
    res.status(403).json({ error: "You can only delete your own reel" });
    return;
  }
  await db
    .update(reelsTable)
    .set({ deletedAt: new Date() })
    .where(eq(reelsTable.id, id));
  res.json({ success: true, message: "Reel moved to trash (auto-deletes in 30 days)" });
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
  if (!reel || !(await canViewReel(reel.authorId, req.userId!))) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }
  await db
    .insert(reelLikesTable)
    .values({ reelId: params.data.id, userId: req.userId!, type: "like" })
    .onConflictDoUpdate({
      target: [reelLikesTable.reelId, reelLikesTable.userId],
      set: { type: "like" },
    });
  await createNotification({
    userId: reel.authorId,
    actorId: req.userId!,
    type: "reaction",
    entityType: "reel",
    entityId: reel.id,
  });
  await awardPoints({
    userId: req.userId!,
    action: "like",
    entityType: "reel",
    entityId: reel.id,
    contentOwnerId: reel.authorId,
    ip: req.ip,
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
    if (!built || !(await canViewReel(built.author.id, req.userId!))) {
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
    if (!reel || !(await canViewReel(reel.authorId, req.userId!))) {
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
    await awardPoints({
      userId: req.userId!,
      action: "like",
      entityType: "reel",
      entityId: reel.id,
      contentOwnerId: reel.authorId,
      ip: req.ip,
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
    if (!built || !(await canViewReel(built.author.id, req.userId!))) {
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
    const [reel] = await db
      .select()
      .from(reelsTable)
      .where(eq(reelsTable.id, params.data.id));
    if (!reel || !(await canViewReel(reel.authorId, req.userId!))) {
      res.status(404).json({ error: "Reel not found" });
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
    if (!reel || !(await canViewReel(reel.authorId, req.userId!))) {
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

    // Duplicate text anti-farm guard, matching post comment logic
    const [dupe] = await db
      .select({ id: reelCommentsTable.id })
      .from(reelCommentsTable)
      .where(
        and(
          eq(reelCommentsTable.authorId, req.userId!),
          eq(reelCommentsTable.content, parsed.data.content),
          ne(reelCommentsTable.id, comment.id),
        ),
      )
      .limit(1);
    if (!dupe) {
      await awardPoints({
        userId: req.userId!,
        action: "comment",
        entityType: "reel_comment",
        entityId: comment.id,
        contentOwnerId: reel.authorId,
        ip: req.ip,
      });
    }

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

router.post(
  "/reels/:id/share",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid reel id" });
      return;
    }
    const [reel] = await db
      .select()
      .from(reelsTable)
      .where(and(eq(reelsTable.id, id), isNull(reelsTable.deletedAt)));
    if (!reel || !(await canViewReel(reel.authorId, req.userId!))) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    await createNotification({
      userId: reel.authorId,
      actorId: req.userId!,
      type: "share",
      entityType: "reel",
      entityId: reel.id,
    });
    await awardPoints({
      userId: req.userId!,
      action: "share",
      entityType: "reel",
      entityId: reel.id,
      contentOwnerId: reel.authorId,
      ip: req.ip,
    });
    const built = await buildReelById(reel.id, req.userId);
    res.json(built);
  },
);

export default router;
