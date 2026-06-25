import { db, presenceTable } from "@workspace/db";

type PresenceStatus = "online" | "offline" | "away";

export async function setPresence(
  userId: string,
  status: PresenceStatus,
): Promise<void> {
  await db
    .insert(presenceTable)
    .values({ userId, status, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: presenceTable.userId,
      set: { status, lastSeenAt: new Date() },
    });
}
