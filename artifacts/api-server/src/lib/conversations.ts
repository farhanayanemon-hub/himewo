import {
  db,
  conversationsTable,
  conversationMembersTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

// Find an existing direct conversation between two users, or create one.
// Mirrors the dedupe logic used by POST /conversations.
export async function findOrCreateDirectConversation(
  viewerId: string,
  otherId: string,
): Promise<number> {
  const mine = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(eq(conversationMembersTable.userId, viewerId));
  const myIds = mine.map((m) => m.conversationId);
  if (myIds.length > 0) {
    const shared = await db
      .select({ conversationId: conversationMembersTable.conversationId })
      .from(conversationMembersTable)
      .where(
        and(
          eq(conversationMembersTable.userId, otherId),
          inArray(conversationMembersTable.conversationId, myIds),
        ),
      );
    for (const s of shared) {
      const [conv] = await db
        .select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.id, s.conversationId),
            eq(conversationsTable.type, "direct"),
          ),
        );
      if (conv) return conv.id;
    }
  }
  const [conv] = await db
    .insert(conversationsTable)
    .values({ type: "direct", createdBy: viewerId })
    .returning();
  await db.insert(conversationMembersTable).values([
    { conversationId: conv.id, userId: viewerId, role: "admin" as const },
    { conversationId: conv.id, userId: otherId, role: "member" as const },
  ]);
  return conv.id;
}
