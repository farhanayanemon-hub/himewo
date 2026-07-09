import { Router, type IRouter } from "express";
import { db, postsTable, friendshipsTable } from "@workspace/db";
import { and, or, eq, lt, desc, inArray, isNull, ilike } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { filterVisiblePosts } from "../lib/authz";
import { buildPosts } from "../lib/serialize";
import {
  GetHashtagPostsParams,
  GetHashtagPostsQueryParams,
  GetHashtagPostsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Hashtags are word characters only (letters, digits, underscore) — the same
// rule the clients use to linkify "#tag" in post content.
const TAG_RE = /^\w{1,64}$/;

router.get(
  "/hashtags/:tag/posts",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetHashtagPostsParams.safeParse(req.params);
    const query = GetHashtagPostsQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid hashtag request" });
      return;
    }
    const tag = params.data.tag.replace(/^#/, "").trim();
    if (!TAG_RE.test(tag)) {
      res.status(400).json({ error: "Invalid hashtag" });
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

    // Exact-tag match: "#himewo" must not match "#himewolove". ILIKE is the
    // coarse SQL net; the word-boundary check below is authoritative.
    const exactTag = new RegExp(`#${tag}(?![\\w])`, "i");

    // filterVisiblePosts can drop rows AFTER the SQL limit, so scan in
    // batches until we collect a full page or run out of rows (same pattern
    // as the watch feed) — otherwise a short page falsely ends the feed.
    const pageLimit = limit ?? 20;
    const SCAN_BATCH = 50;
    const MAX_SCANS = 8;
    const visibleRows: (typeof postsTable.$inferSelect)[] = [];
    let scanCursor = cursor;
    for (let i = 0; i < MAX_SCANS && visibleRows.length < pageLimit; i++) {
      const rows = await db
        .select()
        .from(postsTable)
        .where(
          and(
            isNull(postsTable.groupId),
            ilike(postsTable.content, `%#${tag}%`),
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
      const exact = rows.filter((r) => exactTag.test(r.content ?? ""));
      // Shared visibility policy (author lock / profileVisibility / per-post
      // privacy) — same as the home feed.
      const vis = await filterVisiblePosts(exact, viewer);
      visibleRows.push(...vis);
      if (rows.length < SCAN_BATCH) break;
    }

    const posts = await buildPosts(visibleRows.slice(0, pageLimit), viewer);
    res.json(GetHashtagPostsResponse.parse(posts));
  },
);

export default router;
