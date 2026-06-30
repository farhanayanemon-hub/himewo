import { Router, type IRouter } from "express";
import { db, groupsTable, pagesTable } from "@workspace/db";
import { desc, eq, ilike } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import { parsePaging } from "../../lib/admin-serialize";

const router: IRouter = Router();

const CommunityModerationBody = z.object({
  featured: z.boolean().optional(),
  isApproved: z.boolean().optional(),
});

function numId(v: string | string[] | undefined): number | null {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// -------------------- Groups --------------------
router.get(
  "/groups",
  requirePermission("communities.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const q = String(req.query.q ?? "").trim();
    const where = q ? ilike(groupsTable.name, `%${q}%`) : undefined;
    const rows = await db
      .select()
      .from(groupsTable)
      .where(where)
      .orderBy(desc(groupsTable.id))
      .limit(limit)
      .offset(offset);
    res.json({ items: rows, limit, offset });
  },
);

router.patch(
  "/groups/:id",
  requirePermission("communities.manage"),
  async (req, res): Promise<void> => {
    const id = numId(req.params.id);
    const parsed = CommunityModerationBody.safeParse(req.body);
    if (id === null || !parsed.success || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(groupsTable)
      .set(parsed.data)
      .where(eq(groupsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "group.update",
      targetType: "group",
      targetId: id,
      metadata: parsed.data,
    });
    res.json(updated);
  },
);

router.delete(
  "/groups/:id",
  requirePermission("communities.manage"),
  async (req, res): Promise<void> => {
    const id = numId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(groupsTable).where(eq(groupsTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "group.delete",
      targetType: "group",
      targetId: id,
    });
    res.sendStatus(204);
  },
);

// -------------------- Pages --------------------
router.get(
  "/pages",
  requirePermission("communities.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const q = String(req.query.q ?? "").trim();
    const where = q ? ilike(pagesTable.name, `%${q}%`) : undefined;
    const rows = await db
      .select()
      .from(pagesTable)
      .where(where)
      .orderBy(desc(pagesTable.id))
      .limit(limit)
      .offset(offset);
    res.json({ items: rows, limit, offset });
  },
);

router.patch(
  "/pages/:id",
  requirePermission("communities.manage"),
  async (req, res): Promise<void> => {
    const id = numId(req.params.id);
    const parsed = CommunityModerationBody.safeParse(req.body);
    if (id === null || !parsed.success || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(pagesTable)
      .set(parsed.data)
      .where(eq(pagesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Page not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "page.update",
      targetType: "page",
      targetId: id,
      metadata: parsed.data,
    });
    res.json(updated);
  },
);

router.delete(
  "/pages/:id",
  requirePermission("communities.manage"),
  async (req, res): Promise<void> => {
    const id = numId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(pagesTable).where(eq(pagesTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "page.delete",
      targetType: "page",
      targetId: id,
    });
    res.sendStatus(204);
  },
);

export default router;
