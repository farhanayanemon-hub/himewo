import { Router, type IRouter } from "express";
import {
  db,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  messageAttachmentsTable,
  messageReactionsTable,
} from "@workspace/db";
import { and, eq, lt, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  buildConversations,
  buildConversationById,
  buildMessages,
  buildMessageById,
} from "../lib/serialize";
import { createNotification } from "../lib/notify";
import { realtime } from "../realtime";
import {
  ListConversationsResponse,
  CreateConversationBody,
  CreateConversationResponse,
  GetConversationParams,
  GetConversationResponse,
  UpdateConversationParams,
  UpdateConversationBody,
  UpdateConversationResponse,
  ListMessagesParams,
  ListMessagesQueryParams,
  ListMessagesResponse,
  SendMessageParams,
  SendMessageBody,
  SendMessageResponse,
  MarkConversationReadParams,
  MarkConversationReadBody,
  AddConversationMembersParams,
  AddConversationMembersBody,
  AddConversationMembersResponse,
  RemoveConversationMemberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getMembership(conversationId: number, userId: string) {
  const [row] = await db
    .select()
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        eq(conversationMembersTable.userId, userId),
      ),
    );
  return row ?? null;
}

async function isMember(conversationId: number, userId: string) {
  return Boolean(await getMembership(conversationId, userId));
}

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const viewer = req.userId!;
  const memberRows = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(eq(conversationMembersTable.userId, viewer));
  const ids = memberRows.map((m) => m.conversationId);
  if (ids.length === 0) {
    res.json(ListConversationsResponse.parse([]));
    return;
  }
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(inArray(conversationsTable.id, ids))
    .orderBy(desc(conversationsTable.lastMessageAt));
  const built = await buildConversations(rows, viewer);
  res.json(ListConversationsResponse.parse(built));
});

router.post("/conversations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const viewer = req.userId!;
  const memberIds = [...new Set([viewer, ...parsed.data.memberIds])];
  const type =
    parsed.data.type ?? (memberIds.length === 2 ? "direct" : "group");

  // Dedupe existing direct conversation between the same two users.
  if (type === "direct" && memberIds.length === 2) {
    const mine = await db
      .select({ conversationId: conversationMembersTable.conversationId })
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.userId, viewer));
    const myIds = mine.map((m) => m.conversationId);
    if (myIds.length > 0) {
      const other = memberIds.find((id) => id !== viewer)!;
      const shared = await db
        .select({ conversationId: conversationMembersTable.conversationId })
        .from(conversationMembersTable)
        .where(
          and(
            eq(conversationMembersTable.userId, other),
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
        if (conv) {
          const built = await buildConversationById(conv.id, viewer);
          res.status(200).json(CreateConversationResponse.parse(built));
          return;
        }
      }
    }
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({
      type,
      title: parsed.data.title ?? null,
      createdBy: viewer,
    })
    .returning();
  await db.insert(conversationMembersTable).values(
    memberIds.map((userId) => ({
      conversationId: conv.id,
      userId,
      role: userId === viewer ? ("admin" as const) : ("member" as const),
    })),
  );
  const built = await buildConversationById(conv.id, viewer);
  res.status(201).json(CreateConversationResponse.parse(built));
});

router.get("/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await isMember(params.data.id, req.userId!))) {
    res.status(403).json({ error: "Not a member" });
    return;
  }
  const built = await buildConversationById(params.data.id, req.userId!);
  if (!built) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(GetConversationResponse.parse(built));
});

router.patch(
  "/conversations/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateConversationParams.safeParse(req.params);
    const parsed = UpdateConversationBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!(await isMember(params.data.id, req.userId!))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    await db
      .update(conversationsTable)
      .set({
        title: parsed.data.title,
        avatarUrl: parsed.data.avatarUrl,
      })
      .where(eq(conversationsTable.id, params.data.id));
    const built = await buildConversationById(params.data.id, req.userId!);
    res.json(UpdateConversationResponse.parse(built));
  },
);

router.get(
  "/conversations/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListMessagesParams.safeParse(req.params);
    const query = ListMessagesQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!(await isMember(params.data.id, req.userId!))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    const { cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.conversationId, params.data.id),
          cursor ? lt(messagesTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(messagesTable.id))
      .limit(limit ?? 30);
    // Return ascending (oldest first) within the page.
    const built = await buildMessages(rows.reverse(), req.userId!);
    res.json(ListMessagesResponse.parse(built));
  },
);

router.post(
  "/conversations/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SendMessageParams.safeParse(req.params);
    const parsed = SendMessageBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!(await isMember(params.data.id, req.userId!))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    const [message] = await db
      .insert(messagesTable)
      .values({
        conversationId: params.data.id,
        senderId: req.userId!,
        content: parsed.data.content ?? "",
        type: parsed.data.type ?? "text",
        replyToId: parsed.data.replyToId ?? null,
      })
      .returning();
    if (parsed.data.attachments && parsed.data.attachments.length > 0) {
      await db.insert(messageAttachmentsTable).values(
        parsed.data.attachments.map((a) => ({
          messageId: message.id,
          url: a.url,
          type: a.type,
          name: a.name ?? null,
          thumbnailUrl: a.thumbnailUrl ?? null,
          sizeBytes: a.sizeBytes ?? null,
          width: a.width ?? null,
          height: a.height ?? null,
          durationMs: a.durationMs ?? null,
        })),
      );
    }
    await db
      .update(conversationsTable)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, params.data.id));
    const built = await buildMessageById(message.id, req.userId!);
    await realtime.toConversation(params.data.id, {
      type: "message",
      conversationId: params.data.id,
      message: built,
    });
    // Notify other members.
    const members = await db
      .select({ userId: conversationMembersTable.userId })
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.conversationId, params.data.id));
    for (const m of members) {
      if (m.userId !== req.userId) {
        await createNotification({
          userId: m.userId,
          actorId: req.userId!,
          type: "message",
          entityType: "conversation",
          entityId: params.data.id,
        });
      }
    }
    res.status(201).json(SendMessageResponse.parse(built));
  },
);

router.post(
  "/conversations/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = MarkConversationReadParams.safeParse(req.params);
    const parsed = MarkConversationReadBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!(await isMember(params.data.id, req.userId!))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    await db
      .update(conversationMembersTable)
      .set({ lastReadMessageId: parsed.data.messageId })
      .where(
        and(
          eq(conversationMembersTable.conversationId, params.data.id),
          eq(conversationMembersTable.userId, req.userId!),
        ),
      );
    await realtime.toConversation(
      params.data.id,
      {
        type: "seen",
        conversationId: params.data.id,
        messageId: parsed.data.messageId,
        userId: req.userId!,
      },
      req.userId!,
    );
    res.sendStatus(204);
  },
);

router.post(
  "/conversations/:id/members",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = AddConversationMembersParams.safeParse(req.params);
    const parsed = AddConversationMembersBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!(await isMember(params.data.id, req.userId!))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    if (parsed.data.userIds.length > 0) {
      await db
        .insert(conversationMembersTable)
        .values(
          parsed.data.userIds.map((userId) => ({
            conversationId: params.data.id,
            userId,
          })),
        )
        .onConflictDoNothing();
    }
    const built = await buildConversationById(params.data.id, req.userId!);
    res.json(AddConversationMembersResponse.parse(built));
  },
);

router.delete(
  "/conversations/:id/members/:userId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveConversationMemberParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const membership = await getMembership(params.data.id, req.userId!);
    if (!membership) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    // Members may remove only themselves; admins may remove anyone.
    const removingSelf = params.data.userId === req.userId;
    if (!removingSelf && membership.role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    await db
      .delete(conversationMembersTable)
      .where(
        and(
          eq(conversationMembersTable.conversationId, params.data.id),
          eq(conversationMembersTable.userId, params.data.userId),
        ),
      );
    res.sendStatus(204);
  },
);

router.put(
  "/messages/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const emoji =
      typeof req.body?.emoji === "string" ? req.body.emoji : undefined;
    if (!id || !emoji) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [msg] = await db
      .select({ conversationId: messagesTable.conversationId })
      .from(messagesTable)
      .where(eq(messagesTable.id, id));
    if (!msg) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (!(await isMember(msg.conversationId, req.userId!))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    await db
      .insert(messageReactionsTable)
      .values({ messageId: id, userId: req.userId!, emoji })
      .onConflictDoUpdate({
        target: [messageReactionsTable.messageId, messageReactionsTable.userId],
        set: { emoji },
      });
    const built = await buildMessageById(id, req.userId!);
    if (!built) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    res.json(built);
  },
);

router.delete(
  "/messages/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [msg] = await db
      .select({ conversationId: messagesTable.conversationId })
      .from(messagesTable)
      .where(eq(messagesTable.id, id));
    if (!msg) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (!(await isMember(msg.conversationId, req.userId!))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    await db
      .delete(messageReactionsTable)
      .where(
        and(
          eq(messageReactionsTable.messageId, id),
          eq(messageReactionsTable.userId, req.userId!),
        ),
      );
    const built = await buildMessageById(id, req.userId!);
    if (!built) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    res.json(built);
  },
);

router.delete("/messages/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id));
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  if (message.senderId !== req.userId) {
    res.status(403).json({ error: "Not your message" });
    return;
  }
  await db
    .update(messagesTable)
    .set({ deletedAt: new Date(), content: "" })
    .where(eq(messagesTable.id, id));
  await realtime.toConversation(message.conversationId, {
    type: "message_deleted",
    conversationId: message.conversationId,
    messageId: id,
  });
  res.sendStatus(204);
});

export default router;
