import { Router, type IRouter } from "express";
import {
  db,
  reportsTable,
  verificationRequestsTable,
  profilesTable,
  announcementsTable,
} from "@workspace/db";
import { and, eq, desc, gt, or, isNull } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../lib/auth";
import { createNotification } from "../lib/notify";
import { getFlags, getSettings } from "../lib/flags";
import {
  getVerificationRequirements,
  getVerificationProgress,
  unmetRequirements,
} from "../lib/verification";

const router: IRouter = Router();

const ReportBody = z.object({
  targetType: z.enum(["post", "comment", "user", "reel", "story"]),
  targetId: z
    .union([z.string(), z.number()])
    .transform((v) => String(v)),
  reason: z.string().min(1).max(200),
  details: z.string().max(2000).optional(),
});

// Public report intake. Any signed-in user can file a report from the apps.
router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const parsed = ReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(reportsTable)
    .values({
      reporterId: req.userId!,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
    })
    .returning();
  res.status(201).json({ id: row.id, status: row.status });
});

const VerificationBody = z.object({ note: z.string().max(1000).optional() });

// A user requests the blue tick. One pending request at a time.
router.post(
  "/verification-requests",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = VerificationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    // Align with /verification/request: already-verified users can't apply.
    const [profile] = await db
      .select({ isVerified: profilesTable.isVerified })
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!));
    if (profile?.isVerified) {
      res.status(400).json({ error: "You are already verified" });
      return;
    }
    // Same eligibility policy as /verification/request.
    const [vreq, vprog] = await Promise.all([
      getVerificationRequirements(),
      getVerificationProgress(req.userId!),
    ]);
    const vmissing = vprog ? unmetRequirements(vreq, vprog) : [];
    if (!vprog || vmissing.length > 0) {
      res.status(400).json({
        error: `You don't meet the requirements yet: ${vmissing.join("; ")}`,
        missing: vmissing,
      });
      return;
    }
    const [existing] = await db
      .select()
      .from(verificationRequestsTable)
      .where(
        and(
          eq(verificationRequestsTable.userId, req.userId!),
          eq(verificationRequestsTable.status, "pending"),
        ),
      );
    if (existing) {
      res
        .status(409)
        .json({ error: "You already have a pending verification request" });
      return;
    }
    try {
      const [row] = await db
        .insert(verificationRequestsTable)
        .values({ userId: req.userId!, note: parsed.data.note ?? null })
        .returning();
      // Confirmation notification: request received and pending review.
      await createNotification({
        userId: req.userId!,
        type: "verification",
        entityType: "verification_pending",
        entityId: row.id,
      });
      res.status(201).json({ id: row.id, status: row.status });
    } catch (err) {
      // Partial unique index (one pending per user) — double-submit race.
      if ((err as { code?: string }).code === "23505") {
        res
          .status(409)
          .json({ error: "You already have a pending verification request" });
        return;
      }
      throw err;
    }
  },
);

router.get(
  "/verification-requests/me",
  requireAuth,
  async (req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(verificationRequestsTable)
      .where(eq(verificationRequestsTable.userId, req.userId!))
      .orderBy(desc(verificationRequestsTable.createdAt));
    res.json(rows);
  },
);

// Active announcements for in-app banners (polled by the apps).
router.get("/announcements/active", async (_req, res): Promise<void> => {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcementsTable)
    .where(
      and(
        eq(announcementsTable.active, true),
        or(
          isNull(announcementsTable.expiresAt),
          gt(announcementsTable.expiresAt, now),
        ),
      ),
    )
    .orderBy(desc(announcementsTable.createdAt));
  res.json(rows);
});

// Public site config: drives client feature gating, branding and the
// maintenance banner. Intentionally unauthenticated.
router.get("/config", async (_req, res): Promise<void> => {
  const [flags, settings] = await Promise.all([getFlags(), getSettings()]);
  res.json({
    siteName: settings.site_name,
    logoUrl: settings.logo_url,
    maintenance: settings.maintenance_mode === "on",
    maintenanceMessage: settings.maintenance_message,
    features: flags,
  });
});

export default router;
