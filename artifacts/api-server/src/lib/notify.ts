import { db, notificationsTable, type Notification } from "@workspace/db";
import { realtime } from "../realtime";

type NotificationType = Notification["type"];

export async function createNotification(params: {
  userId: string;
  actorId?: string;
  type: NotificationType;
  entityType?: string;
  entityId?: number;
}): Promise<void> {
  // Don't notify yourself.
  if (params.actorId && params.actorId === params.userId) return;
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
