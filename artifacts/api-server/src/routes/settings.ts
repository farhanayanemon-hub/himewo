import { Router, type IRouter } from "express";
import { db, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getNavIcons } from "../lib/flags";
import {
  GetMySettingsResponse,
  UpdateMySettingsBody,
  UpdateMySettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Public (no auth): admin-uploaded custom nav icon URLs for web/mobile
// clients. Returns {} when admins haven't customized anything — clients fall
// back to their built-in icons.
router.get("/site/nav-icons", async (_req, res): Promise<void> => {
  res.json({ icons: await getNavIcons() });
});

type SettingsRow = typeof userSettingsTable.$inferSelect;

function toSettings(row: SettingsRow) {
  return {
    profileVisibility: row.profileVisibility,
    postVisibility: row.postVisibility,
    friendRequestPrivacy: row.friendRequestPrivacy,
    showOnlineStatus: row.showOnlineStatus,
    isLocked: row.isLocked,
    notifyLikes: row.notifyLikes,
    notifyComments: row.notifyComments,
    notifyFriendRequests: row.notifyFriendRequests,
    notifyMessages: row.notifyMessages,
    emailNotifications: row.emailNotifications,
    pushNotifications: row.pushNotifications,
    language: row.language,
  };
}

async function getOrCreateSettings(userId: string): Promise<SettingsRow> {
  const [existing] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(userSettingsTable)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [row] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  return row;
}

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const row = await getOrCreateSettings(req.userId!);
  res.json(GetMySettingsResponse.parse(toSettings(row)));
});

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMySettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await getOrCreateSettings(req.userId!);
  const updates = parsed.data;
  const hasUpdates = Object.values(updates).some((v) => v !== undefined);
  if (hasUpdates) {
    await db
      .update(userSettingsTable)
      .set(updates)
      .where(eq(userSettingsTable.userId, req.userId!));
  }
  const [row] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, req.userId!));
  res.json(UpdateMySettingsResponse.parse(toSettings(row)));
});

export default router;
