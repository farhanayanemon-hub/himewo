import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { requirePermission } from "../../lib/admin-auth";
import { loadAdminProfileMap, parsePaging } from "../../lib/admin-serialize";

const router: IRouter = Router();

router.get(
  "/audit",
  requirePermission("audit.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const actorId = req.query.actorId;
    const action = req.query.action;
    const conds = [];
    if (typeof actorId === "string" && actorId)
      conds.push(eq(auditLogsTable.actorId, actorId));
    if (typeof action === "string" && action)
      conds.push(ilike(auditLogsTable.action, `%${action}%`));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(auditLogsTable)
        .where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(auditLogsTable).where(where),
    ]);
    const map = await loadAdminProfileMap(rows.map((r) => r.actorId));
    res.json({
      items: rows.map((r) => ({
        ...r,
        actor: r.actorId ? (map.get(r.actorId) ?? null) : null,
      })),
      total,
      limit,
      offset,
    });
  },
);

export default router;
