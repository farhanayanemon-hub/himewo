import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  postMediaTable,
  friendshipsTable,
} from "@workspace/db";
import { and, or, eq, lt, desc, inArray, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { filterVisiblePosts } from "../lib/authz";
import { buildPosts } from "../lib/serialize";
import { GetWatchFeedQueryParams, GetWatchFeedResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/watch", requireAuth, async (req, res): Promise<void> => {
  const query = GetWatchFeedQueryParams.safeParse(req.query);
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

  // Only posts that carry at least one video attachment.
  const videoPostIds = db
    .select({ postId: postMediaTable.postId })
    .from(postMediaTable)
    .where(eq(postMediaTable.type, "video"));

  // filterVisiblePosts can drop rows AFTER the SQL limit, so a single
  // limited query could return a short page while older visible videos
  // still exist (the client treats short page == end of feed). Scan in
  // batches until we collect a full page or truly run out of rows.
  const pageLimit = limit ?? 20;
  const SCAN_BATCH = 50;
  const MAX_SCANS = 8;
  const visibleRows: typeof postsTable.$inferSelect[] = [];
  let scanCursor = cursor;
  for (let i = 0; i < MAX_SCANS && visibleRows.length < pageLimit; i++) {
    const rows = await db
      .select()
      .from(postsTable)
      .where(
        and(
          isNull(postsTable.groupId),
          inArray(postsTable.id, videoPostIds),
          or(
            eq(postsTable.privacy, "public"),
            inArray(postsTable.authorId, visibleAuthors),
          ),
          scanCursor ? lt(postsTable.id, scanCursor) : undefined,
        ),
      )
      .orderBy(desc(postsTable.id))
      .limit(SCAN_BATCH);
    if (rows.length === 0) break;
    scanCursor = rows[rows.length - 1]!.id;
    // Same shared visibility policy as the home feed, so author lock /
    // profileVisibility / per-post privacy are all honored here too.
    const vis = await filterVisiblePosts(rows, viewer);
    visibleRows.push(...vis);
    if (rows.length < SCAN_BATCH) break;
  }

  const posts = await buildPosts(visibleRows.slice(0, pageLimit), viewer);
  res.json(GetWatchFeedResponse.parse(posts));
});

export default router;
