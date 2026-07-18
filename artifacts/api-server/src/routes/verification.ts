import { Router, type IRouter } from "express";
import { db, verificationRequestsTable, profilesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../lib/auth";
import { createNotification } from "../lib/notify";
import {
  getVerificationRequirements,
  getVerificationProgress,
  unmetRequirements,
} from "../lib/verification";

const router: IRouter = Router();

/**
 * Public (authenticated) verified-badge request flow. The admin review queue
 * lives in routes/admin/verification.ts; these routes let a regular user see
 * their own status and submit a request into that queue.
 */

// GET /verification/request — the caller's verified state + latest request.
router.get(
  "/verification/request",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const [[profile], [latest], requirements, progress] = await Promise.all([
      db
        .select({ isVerified: profilesTable.isVerified })
        .from(profilesTable)
        .where(eq(profilesTable.id, userId)),
      db
        .select()
        .from(verificationRequestsTable)
        .where(eq(verificationRequestsTable.userId, userId))
        .orderBy(desc(verificationRequestsTable.createdAt))
        .limit(1),
      getVerificationRequirements(),
      getVerificationProgress(req.userId!),
    ]);
    const missing = progress ? unmetRequirements(requirements, progress) : [];
    res.json({
      isVerified: profile?.isVerified ?? false,
      requirements,
      progress,
      eligible: progress !== null && missing.length === 0,
      missing,
      request: latest
        ? {
            id: latest.id,
            status: latest.status,
            note: latest.note,
            reviewNote: latest.reviewNote,
            createdAt: latest.createdAt,
          }
        : null,
    });
  },
);

const CreateBody = z.object({ note: z.string().trim().max(1000).optional() });

// POST /verification/request — submit a new request (one pending at a time).
router.post(
  "/verification/request",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const parsed = CreateBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [profile] = await db
      .select({ isVerified: profilesTable.isVerified })
      .from(profilesTable)
      .where(eq(profilesTable.id, userId));
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    if (profile.isVerified) {
      res.status(400).json({ error: "You are already verified" });
      return;
    }
    const [requirements, progress] = await Promise.all([
      getVerificationRequirements(),
      getVerificationProgress(userId),
    ]);
    const missing = progress ? unmetRequirements(requirements, progress) : [];
    if (!progress || missing.length > 0) {
      res.status(400).json({
        error: `You don't meet the requirements yet: ${missing.join("; ")}`,
        missing,
      });
      return;
    }
    const [pending] = await db
      .select({ id: verificationRequestsTable.id })
      .from(verificationRequestsTable)
      .where(
        and(
          eq(verificationRequestsTable.userId, userId),
          eq(verificationRequestsTable.status, "pending"),
        ),
      )
      .limit(1);
    if (pending) {
      res.status(409).json({ error: "You already have a pending request" });
      return;
    }
    try {
      const [created] = await db
        .insert(verificationRequestsTable)
        .values({ userId, note: parsed.data.note || null })
        .returning();
      // Confirmation notification: request received and pending review.
      await createNotification({
        userId,
        type: "verification",
        entityType: "verification_pending",
        entityId: created.id,
      });
      res.status(201).json({
        id: created.id,
        status: created.status,
        note: created.note,
        createdAt: created.createdAt,
      });
    } catch (err) {
      // Partial unique index (one pending per user) — double-submit race.
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "You already have a pending request" });
        return;
      }
      throw err;
    }
  },
);

export default router;
