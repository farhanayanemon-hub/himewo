import { Router, type IRouter } from "express";
import { db, reportsTable } from "@workspace/db";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import { loadAdminProfileMap, parsePaging } from "../../lib/admin-serialize";

const router: IRouter = Router();

router.get(
  "/reports",
  requirePermission("reports.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const status = req.query.status;
    const targetType = req.query.type;
    const conds = [];
    if (typeof status === "string" && status)
      conds.push(eq(reportsTable.status, status as never));
    if (typeof targetType === "string" && targetType)
      conds.push(eq(reportsTable.targetType, targetType as never));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(reportsTable)
        .where(where)
        .orderBy(desc(reportsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(reportsTable).where(where),
    ]);
    const map = await loadAdminProfileMap([
      ...rows.map((r) => r.reporterId),
      ...rows.map((r) => r.handledBy),
    ]);
    res.json({
      items: rows.map((r) => ({
        ...r,
        reporter: r.reporterId ? (map.get(r.reporterId) ?? null) : null,
        handler: r.handledBy ? (map.get(r.handledBy) ?? null) : null,
      })),
      total,
      limit,
      offset,
    });
  },
);

router.get(
  "/reports/:id",
  requirePermission("reports.view"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const [row] = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const map = await loadAdminProfileMap([row.reporterId, row.handledBy]);
    res.json({
      ...row,
      reporter: row.reporterId ? (map.get(row.reporterId) ?? null) : null,
      handler: row.handledBy ? (map.get(row.handledBy) ?? null) : null,
    });
  },
);

const UpdateReportBody = z.object({
  status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
  resolutionNote: z.string().max(2000).optional(),
});

router.patch(
  "/reports/:id",
  requirePermission("reports.manage"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const parsed = UpdateReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [updated] = await db
      .update(reportsTable)
      .set({
        status: parsed.data.status,
        resolutionNote: parsed.data.resolutionNote ?? null,
        handledBy: req.userId!,
      })
      .where(eq(reportsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "report.update",
      targetType: "report",
      targetId: id,
      metadata: { status: parsed.data.status },
    });
    res.json(updated);
  },
);

export default router;
