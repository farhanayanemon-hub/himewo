import {
  db,
  notificationsTable,
  userSettingsTable,
  type Notification,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { realtime } from "../realtime";

type NotificationType = Notification["type"];

// Map a notification type to the per-user preference that can suppress it.
// Types without an entry are always delivered (no user toggle exists for them).
const PREF_BY_TYPE: Partial<
  Record<
    NotificationType,
    "notifyLikes" | "notifyComments" | "notifyFriendRequests" | "notifyMessages"
  >
> = {
  reaction: "notifyLikes",
  comment: "notifyComments",
  friend_request: "notifyFriendRequests",
  message: "notifyMessages",
};

async function isNotificationAllowed(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const pref = PREF_BY_TYPE[type];
  if (!pref) return true;
  const [settings] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  // No settings row yet => defaults (all enabled).
  if (!settings) return true;
  return settings[pref];
}

export async function createNotification(params: {
  userId: string;
  actorId?: string;
  type: NotificationType;
  entityType?: string;
  entityId?: number;
}): Promise<void> {
  // Don't notify yourself.
  if (params.actorId && params.actorId === params.userId) return;
  // Respect the recipient's notification preferences.
  if (!(await isNotificationAllowed(params.userId, params.type))) return;
  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId: params.userId,
      actorId: params.actorId ?? null,
      type: params.type,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
    })
    .returning();
  if (row) {
    realtime.toUser(params.userId, { type: "notification", notificationId: row.id });
  }
}
