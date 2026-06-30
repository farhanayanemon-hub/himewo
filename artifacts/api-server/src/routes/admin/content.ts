import { Router, type IRouter } from "express";
import {
  db,
  postsTable,
  commentsTable,
  reelsTable,
  storiesTable,
} from "@workspace/db";
import { and, desc, eq, gt, ilike } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import { loadAdminProfileMap, parsePaging } from "../../lib/admin-serialize";

const router: IRouter = Router();

function numericId(req: {
  params: Record<string, string | string[] | undefined>;
}): number | null {
  const raw = req.params.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function withAuthors<T extends { authorId: string }>(rows: T[]) {
  const map = await loadAdminProfileMap(rows.map((r) => r.authorId));
  return rows.map((r) => ({ ...r, author: map.get(r.authorId) ?? null }));
}

// -------------------- Posts --------------------
router.get(
  "/content/posts",
  requirePermission("content.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const q = String(req.query.q ?? "").trim();
    const where = q ? ilike(postsTable.content, `%${q}%`) : undefined;
    const rows = await db
      .select()
      .from(postsTable)
      .where(where)
      .orderBy(desc(postsTable.id))
      .limit(limit)
      .offset(offset);
    res.json({ items: await withAuthors(rows), limit, offset });
  },
);

const PostModerationBody = z.object({
  hidden: z.boolean().optional(),
  pinned: z.boolean().optional(),
  featured: z.boolean().optional(),
});

router.patch(
  "/posts/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = PostModerationBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(postsTable)
      .set(parsed.data)
      .where(eq(postsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "post.moderate",
      targetType: "post",
      targetId: id,
      metadata: parsed.data,
    });
    res.json(updated);
  },
);

router.delete(
  "/posts/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(postsTable).where(eq(postsTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "post.delete",
      targetType: "post",
      targetId: id,
    });
    res.sendStatus(204);
  },
);

// -------------------- Comments --------------------
router.get(
  "/content/comments",
  requirePermission("content.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const q = String(req.query.q ?? "").trim();
    const where = q ? ilike(commentsTable.content, `%${q}%`) : undefined;
    const rows = await db
      .select()
      .from(commentsTable)
      .where(where)
      .orderBy(desc(commentsTable.id))
      .limit(limit)
      .offset(offset);
    res.json({ items: await withAuthors(rows), limit, offset });
  },
);

router.patch(
  "/comments/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = z.object({ hidden: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(commentsTable)
      .set({ hidden: parsed.data.hidden })
      .where(eq(commentsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "comment.moderate",
      targetType: "comment",
      targetId: id,
      metadata: parsed.data,
    });
    res.json(updated);
  },
);

router.delete(
  "/comments/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(commentsTable).where(eq(commentsTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "comment.delete",
      targetType: "comment",
      targetId: id,
    });
    res.sendStatus(204);
  },
);

// -------------------- Reels --------------------
router.get(
  "/content/reels",
  requirePermission("content.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const q = String(req.query.q ?? "").trim();
    const where = q ? ilike(reelsTable.caption, `%${q}%`) : undefined;
    const rows = await db
      .select()
      .from(reelsTable)
      .where(where)
      .orderBy(desc(reelsTable.id))
      .limit(limit)
      .offset(offset);
    res.json({ items: await withAuthors(rows), limit, offset });
  },
);

const ReelModerationBody = z.object({
  hidden: z.boolean().optional(),
  featured: z.boolean().optional(),
});

router.patch(
  "/reels/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = ReelModerationBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(reelsTable)
      .set(parsed.data)
      .where(eq(reelsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "reel.moderate",
      targetType: "reel",
      targetId: id,
      metadata: parsed.data,
    });
    res.json(updated);
  },
);

router.delete(
  "/reels/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(reelsTable).where(eq(reelsTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "reel.delete",
      targetType: "reel",
      targetId: id,
    });
    res.sendStatus(204);
  },
);

// -------------------- Stories --------------------
router.get(
  "/content/stories",
  requirePermission("content.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const activeOnly = req.query.active === "true";
    const where = activeOnly ? gt(storiesTable.expiresAt, new Date()) : undefined;
    const rows = await db
      .select()
      .from(storiesTable)
      .where(where)
      .orderBy(desc(storiesTable.id))
      .limit(limit)
      .offset(offset);
    res.json({ items: await withAuthors(rows), limit, offset });
  },
);

router.patch(
  "/stories/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = z.object({ hidden: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(storiesTable)
      .set({ hidden: parsed.data.hidden })
      .where(eq(storiesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "story.moderate",
      targetType: "story",
      targetId: id,
      metadata: parsed.data,
    });
    res.json(updated);
  },
);

router.delete(
  "/stories/:id",
  requirePermission("content.moderate"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(storiesTable).where(eq(storiesTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "story.delete",
      targetType: "story",
      targetId: id,
    });
    res.sendStatus(204);
  },
);

export default router;
