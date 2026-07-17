import { Router, type IRouter } from "express";
import { db, verificationRequestsTable, profilesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../lib/auth";

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
    const [[profile], [latest]] = await Promise.all([
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
    ]);
    res.json({
      isVerified: profile?.isVerified ?? false,
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
    const [latest] = await db
      .select({ status: verificationRequestsTable.status })
      .from(verificationRequestsTable)
      .where(eq(verificationRequestsTable.userId, userId))
      .orderBy(desc(verificationRequestsTable.createdAt))
      .limit(1);
    if (latest?.status === "pending") {
      res.status(409).json({ error: "You already have a pending request" });
      return;
    }
    const [created] = await db
      .insert(verificationRequestsTable)
      .values({ userId, note: parsed.data.note || null })
      .returning();
    res.status(201).json({
      id: created.id,
      status: created.status,
      note: created.note,
      createdAt: created.createdAt,
    });
  },
);

export default router;
