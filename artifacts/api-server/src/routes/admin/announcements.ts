import { Router, type IRouter } from "express";
import { db, announcementsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";

const router: IRouter = Router();

router.get(
  "/announcements",
  requirePermission("announcements.view"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.createdAt));
    res.json(rows);
  },
);

const CreateBody = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  level: z.enum(["info", "warning", "critical"]).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

router.post(
  "/announcements",
  requirePermission("announcements.manage"),
  async (req, res): Promise<void> => {
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .insert(announcementsTable)
      .values({
        title: parsed.data.title,
        body: parsed.data.body ?? "",
        level: parsed.data.level ?? "info",
        active: parsed.data.active ?? true,
        createdBy: req.userId!,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
      })
      .returning();
    await writeAudit({
      actorId: req.userId,
      action: "announcement.create",
      targetType: "announcement",
      targetId: row.id,
      metadata: { title: row.title, level: row.level },
    });
    res.status(201).json(row);
  },
);

const UpdateBody = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).optional(),
  level: z.enum(["info", "warning", "critical"]).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

router.patch(
  "/announcements/:id",
  requirePermission("announcements.manage"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const parsed = UpdateBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const update: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.body !== undefined) update.body = parsed.data.body;
    if (parsed.data.level !== undefined) update.level = parsed.data.level;
    if (parsed.data.active !== undefined) update.active = parsed.data.active;
    if (parsed.data.expiresAt !== undefined)
      update.expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null;
    const [updated] = await db
      .update(announcementsTable)
      .set(update)
      .where(eq(announcementsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "announcement.update",
      targetType: "announcement",
      targetId: id,
      metadata: update,
    });
    res.json(updated);
  },
);

router.delete(
  "/announcements/:id",
  requirePermission("announcements.manage"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "announcement.delete",
      targetType: "announcement",
      targetId: id,
    });
    res.sendStatus(204);
  },
);

export default router;
