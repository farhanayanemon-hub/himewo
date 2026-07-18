import { Router, type IRouter } from "express";
import { db, verificationRequestsTable, profilesTable } from "@workspace/db";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import { loadAdminProfileMap, parsePaging } from "../../lib/admin-serialize";
import { createNotification } from "../../lib/notify";

const router: IRouter = Router();

router.get(
  "/verification",
  requirePermission("verification.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const status = req.query.status;
    const conds = [];
    if (typeof status === "string" && status)
      conds.push(eq(verificationRequestsTable.status, status as never));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(verificationRequestsTable)
        .where(where)
        .orderBy(desc(verificationRequestsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(verificationRequestsTable)
        .where(where),
    ]);
    const map = await loadAdminProfileMap([
      ...rows.map((r) => r.userId),
      ...rows.map((r) => r.handledBy),
    ]);
    res.json({
      items: rows.map((r) => ({
        ...r,
        user: map.get(r.userId) ?? null,
        handler: r.handledBy ? (map.get(r.handledBy) ?? null) : null,
      })),
      total,
      limit,
      offset,
    });
  },
);

const UpdateBody = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(2000).optional(),
});

router.patch(
  "/verification/:id",
  requirePermission("verification.manage"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const parsed = UpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [updated] = await db
      .update(verificationRequestsTable)
      .set({
        status: parsed.data.status,
        reviewNote: parsed.data.reviewNote ?? null,
        handledBy: req.userId!,
      })
      .where(eq(verificationRequestsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Verification request not found" });
      return;
    }
    if (parsed.data.status === "approved") {
      await db
        .update(profilesTable)
        .set({ isVerified: true })
        .where(eq(profilesTable.id, updated.userId));
    }
    // No actorId: decision notifications shouldn't expose the reviewing admin.
    await createNotification({
      userId: updated.userId,
      type: "verification",
      entityType:
        parsed.data.status === "approved"
          ? "verification_approved"
          : "verification_rejected",
      entityId: updated.id,
    });
    await writeAudit({
      actorId: req.userId,
      action: "verification.review",
      targetType: "verification",
      targetId: id,
      metadata: { status: parsed.data.status, userId: updated.userId },
    });
    res.json(updated);
  },
);

export default router;
