import { Router, type IRouter } from "express";
import {
  db,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  messageAttachmentsTable,
} from "@workspace/db";
import { count, desc, eq, inArray } from "drizzle-orm";
import { requirePermission } from "../../lib/admin-auth";
import { loadAdminProfileMap, parsePaging } from "../../lib/admin-serialize";

const router: IRouter = Router();

function numId(raw: string | string[] | undefined): number | null {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// -------- List the conversations a given user participates in --------
router.get(
  "/users/:id/conversations",
  requirePermission("messages.view"),
  async (req, res): Promise<void> => {
    const userId = String(req.params.id);
    const { limit, offset } = parsePaging(req.query);

    const memberRows = await db
      .select({ conversationId: conversationMembersTable.conversationId })
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.userId, userId));
    const allIds = memberRows.map((r) => r.conversationId);
    if (allIds.length === 0) {
      res.json({ items: [], total: 0, limit, offset });
      return;
    }

    const convs = await db
      .select()
      .from(conversationsTable)
      .where(inArray(conversationsTable.id, allIds))
      .orderBy(desc(conversationsTable.lastMessageAt))
      .limit(limit)
      .offset(offset);
    const pageIds = convs.map((c) => c.id);

    const [members, counts, lastMsgs] = await Promise.all([
      db
        .select({
          conversationId: conversationMembersTable.conversationId,
          userId: conversationMembersTable.userId,
        })
        .from(conversationMembersTable)
        .where(inArray(conversationMembersTable.conversationId, pageIds)),
      db
        .select({ conversationId: messagesTable.conversationId, value: count() })
        .from(messagesTable)
        .where(inArray(messagesTable.conversationId, pageIds))
        .groupBy(messagesTable.conversationId),
      db
        .selectDistinctOn([messagesTable.conversationId], {
          conversationId: messagesTable.conversationId,
          content: messagesTable.content,
          type: messagesTable.type,
          senderId: messagesTable.senderId,
          createdAt: messagesTable.createdAt,
          deletedAt: messagesTable.deletedAt,
        })
        .from(messagesTable)
        .where(inArray(messagesTable.conversationId, pageIds))
        .orderBy(messagesTable.conversationId, desc(messagesTable.createdAt)),
    ]);

    const profileMap = await loadAdminProfileMap([
      ...members.map((m) => m.userId),
      ...lastMsgs.map((m) => m.senderId),
    ]);
    const countMap = new Map(counts.map((c) => [c.conversationId, c.value]));
    const lastMap = new Map(lastMsgs.map((m) => [m.conversationId, m]));
    const membersByConv = new Map<number, string[]>();
    for (const m of members) {
      const arr = membersByConv.get(m.conversationId) ?? [];
      arr.push(m.userId);
      membersByConv.set(m.conversationId, arr);
    }

    const items = convs.map((c) => {
      const memberIds = membersByConv.get(c.id) ?? [];
      const resolve = (ids: string[]) =>
        ids
          .map((uid) => profileMap.get(uid))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
      const lm = lastMap.get(c.id) ?? null;
      return {
        id: c.id,
        type: c.type,
        title: c.title,
        createdAt: c.createdAt,
        lastMessageAt: c.lastMessageAt,
        messageCount: countMap.get(c.id) ?? 0,
        participants: resolve(memberIds),
        otherParticipants: resolve(memberIds.filter((uid) => uid !== userId)),
        lastMessage: lm
          ? {
              content: lm.deletedAt ? "" : lm.content,
              type: lm.type,
              senderId: lm.senderId,
              createdAt: lm.createdAt,
              deleted: !!lm.deletedAt,
            }
          : null,
      };
    });

    res.json({ items, total: allIds.length, limit, offset });
  },
);

// -------- Full message thread of one conversation --------
router.get(
  "/conversations/:id/messages",
  requirePermission("messages.view"),
  async (req, res): Promise<void> => {
    const convId = numId(req.params.id);
    if (convId === null) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }
    const { limit, offset } = parsePaging(req.query);

    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, convId));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const [memberRows, [{ value: total }], rows] = await Promise.all([
      db
        .select({ userId: conversationMembersTable.userId })
        .from(conversationMembersTable)
        .where(eq(conversationMembersTable.conversationId, convId)),
      db
        .select({ value: count() })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId)),
      db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId))
        .orderBy(desc(messagesTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    // Return chronological order (oldest first) for natural chat display.
    const ordered = [...rows].reverse();
    const attachments = ordered.length
      ? await db
          .select()
          .from(messageAttachmentsTable)
          .where(
            inArray(
              messageAttachmentsTable.messageId,
              ordered.map((m) => m.id),
            ),
          )
      : [];
    const attByMsg = new Map<number, typeof attachments>();
    for (const a of attachments) {
      const arr = attByMsg.get(a.messageId) ?? [];
      arr.push(a);
      attByMsg.set(a.messageId, arr);
    }

    const profileMap = await loadAdminProfileMap([
      ...memberRows.map((m) => m.userId),
      ...ordered.map((m) => m.senderId),
    ]);

    const items = ordered.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.deletedAt ? "" : m.content,
      type: m.type,
      replyToId: m.replyToId,
      createdAt: m.createdAt,
      editedAt: m.editedAt,
      deleted: !!m.deletedAt,
      sender: profileMap.get(m.senderId) ?? null,
      attachments: (attByMsg.get(m.id) ?? []).map((a) => ({
        id: a.id,
        url: a.url,
        type: a.type,
        name: a.name,
        thumbnailUrl: a.thumbnailUrl,
      })),
    }));

    res.json({
      conversation: {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        createdAt: conv.createdAt,
        participants: memberRows
          .map((m) => profileMap.get(m.userId))
          .filter((p): p is NonNullable<typeof p> => Boolean(p)),
      },
      items,
      total,
      limit,
      offset,
    });
  },
);

export default router;
