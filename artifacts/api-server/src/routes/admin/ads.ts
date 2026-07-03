import { Router, type IRouter } from "express";
import {
  db,
  adsTable,
  adAccountsTable,
  adCampaignsTable,
  adSetsTable,
  adCreativesTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
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

const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

// -------------------- Ads review queue --------------------
router.get(
  "/ads",
  requirePermission("ads.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const statusRaw = String(req.query.status ?? "pending").trim();
    const status = (REVIEW_STATUSES as readonly string[]).includes(statusRaw)
      ? statusRaw
      : "pending";

    const rows = await db
      .select({
        ad: adsTable,
        accountName: adAccountsTable.name,
        ownerId: adAccountsTable.ownerId,
        campaignName: adCampaignsTable.name,
        objective: adCampaignsTable.objective,
        creative: adCreativesTable,
      })
      .from(adsTable)
      .leftJoin(adAccountsTable, eq(adsTable.accountId, adAccountsTable.id))
      .leftJoin(adSetsTable, eq(adsTable.adSetId, adSetsTable.id))
      .leftJoin(
        adCampaignsTable,
        eq(adSetsTable.campaignId, adCampaignsTable.id),
      )
      .leftJoin(adCreativesTable, eq(adsTable.creativeId, adCreativesTable.id))
      .where(eq(adsTable.reviewStatus, status))
      .orderBy(desc(adsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const ownerMap = await loadAdminProfileMap(
      rows.map((r) => r.ownerId).filter((v): v is string => !!v),
    );

    const items = rows.map((r) => ({
      ...r.ad,
      accountName: r.accountName,
      owner: r.ownerId ? (ownerMap.get(r.ownerId) ?? null) : null,
      campaignName: r.campaignName,
      objective: r.objective,
      creative: r.creative ?? null,
    }));

    res.json({ items, limit, offset, status });
  },
);

const ReviewBody = z.object({
  note: z.string().max(2000).optional(),
});

router.post(
  "/ads/:id/approve",
  requirePermission("ads.manage"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = ReviewBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(adsTable)
      .set({
        reviewStatus: "approved",
        status: "active",
        reviewNote: parsed.data.note ?? null,
        reviewedBy: req.userId ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(adsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "ad.approve",
      targetType: "ad",
      targetId: id,
      metadata: parsed.data.note ? { note: parsed.data.note } : null,
    });
    res.json(updated);
  },
);

router.post(
  "/ads/:id/reject",
  requirePermission("ads.manage"),
  async (req, res): Promise<void> => {
    const id = numericId(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = ReviewBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [updated] = await db
      .update(adsTable)
      .set({
        reviewStatus: "rejected",
        status: "paused",
        reviewNote: parsed.data.note ?? null,
        reviewedBy: req.userId ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(adsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "ad.reject",
      targetType: "ad",
      targetId: id,
      metadata: parsed.data.note ? { note: parsed.data.note } : null,
    });
    res.json(updated);
  },
);

export default router;
