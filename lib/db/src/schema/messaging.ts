import {
  pgTable,
  serial,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import {
  conversationTypeEnum,
  messageTypeEnum,
  memberRoleEnum,
  attachmentTypeEnum,
  presenceStatusEnum,
} from "./enums";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  type: conversationTypeEnum("type").notNull().default("direct"),
  title: text("title"),
  avatarUrl: text("avatar_url"),
  createdBy: uuid("created_by").references(() => profilesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const conversationMembersTable = pgTable(
  "conversation_members",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    lastReadMessageId: integer("last_read_message_id"),
    // Per-viewer conversation preferences (Messenger-style).
    isPinned: boolean("is_pinned").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    isMuted: boolean("is_muted").notNull().default(false),
    markedUnread: boolean("marked_unread").notNull().default(false),
    // "Delete chat for me": messages with id <= cleared_before_id are hidden
    // for this member; the conversation reappears when a new message arrives.
    clearedBeforeId: integer("cleared_before_id"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("conversation_members_uniq").on(t.conversationId, t.userId),
  ],
);

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    type: messageTypeEnum("type").notNull().default("text"),
    replyToId: integer("reply_to_id"),
    // When set, this message is a reply to a story; renders a story preview
    // above the text (Facebook-style). References stories.id.
    storyId: integer("story_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("messages_conversation_created_idx").on(
      t.conversationId,
      t.createdAt,
    ),
  ],
);

export const messageAttachmentsTable = pgTable("message_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => messagesTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: attachmentTypeEnum("type").notNull(),
  name: text("name"),
  thumbnailUrl: text("thumbnail_url"),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
});

export const messageReactionsTable = pgTable(
  "message_reactions",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("message_reactions_uniq").on(t.messageId, t.userId)],
);

// "Delete for me": hides a message for one user only (the message stays for others).
export const messageHidesTable = pgTable(
  "message_hides",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("message_hides_uniq").on(t.messageId, t.userId)],
);

// Block / restrict relationships. kind is a plain text column ("block" |
// "restrict") to avoid an enum migration; enforced by the API layer.
export const userBlocksTable = pgTable(
  "user_blocks",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("user_blocks_uniq").on(t.userId, t.targetId, t.kind),
    index("user_blocks_target_idx").on(t.targetId, t.kind),
  ],
);

export const presenceTable = pgTable("presence", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  status: presenceStatusEnum("status").notNull().default("offline"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type ConversationMember = typeof conversationMembersTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type MessageAttachment = typeof messageAttachmentsTable.$inferSelect;
export type MessageReaction = typeof messageReactionsTable.$inferSelect;
export type MessageHide = typeof messageHidesTable.$inferSelect;
export type UserBlock = typeof userBlocksTable.$inferSelect;
export type Presence = typeof presenceTable.$inferSelect;
