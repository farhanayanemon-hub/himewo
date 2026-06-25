import { Router, type IRouter } from "express";
import { db, profilesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { buildProfileDetail } from "../lib/serialize";
import {
  GetCurrentUserResponse,
  SyncProfileBody,
  SyncProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const profile = await buildProfileDetail(req.userId!, req.userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found. Call /auth/sync first." });
    return;
  }
  res.json(GetCurrentUserResponse.parse(profile));
});

router.post("/auth/sync", requireAuth, async (req, res): Promise<void> => {
  const parsed = SyncProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.userId!;
  const data = parsed.data;
  const [row] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      username: data.username,
      displayName: data.displayName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      avatarUrl: data.avatarUrl ?? null,
    })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: {
        displayName: data.displayName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
    })
    .returning();
  const profile = await buildProfileDetail(row.id, userId);
  res.json(SyncProfileResponse.parse(profile));
});

export default router;
