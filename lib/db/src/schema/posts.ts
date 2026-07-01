import {
  pgTable,
  serial,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { reactionTypeEnum, mediaTypeEnum, privacyEnum } from "./enums";

export const postsTable = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    // Facebook-style expression: a feeling/activity tag ("feeling happy 😊",
    // "watching a movie 🎬") and an optional check-in location. feelingVerb is
    // the leading word ("feeling", "watching", ...); feeling is the label
    // ("happy", "a movie"); feelingEmoji is the accompanying emoji.
    feelingVerb: text("feeling_verb"),
    feeling: text("feeling"),
    feelingEmoji: text("feeling_emoji"),
    location: text("location"),
    privacy: privacyEnum("privacy").notNull().default("public"),
    commentsEnabled: boolean("comments_enabled").notNull().default(true),
    reactionsEnabled: boolean("reactions_enabled").notNull().default(true),
    // Moderation / curation flags (managed from the admin panel).
    hidden: boolean("hidden").notNull().default(false),
    pinned: boolean("pinned").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    groupId: integer("group_id"),
    pageId: integer("page_id"),
    // Group post approval: when a group requires approval, member posts are
    // created pending and hidden from the group feed until an admin/mod approves.
    pendingApproval: boolean("pending_approval").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("posts_author_created_idx").on(t.authorId, t.createdAt)],
);

export const postMediaTable = pgTable("post_media", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: mediaTypeEnum("type").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  position: integer("position").notNull().default(0),
});

export const postReactionsTable = pgTable(
  "post_reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("post_reactions_post_user_uniq").on(t.postId, t.userId)],
);

export const commentsTable = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"),
    content: text("content").notNull().default(""),
    mediaUrl: text("media_url"),
    // Moderation flag (managed from the admin panel).
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("comments_post_created_idx").on(t.postId, t.createdAt)],
);

export const commentReactionsTable = pgTable(
  "comment_reactions",
  {
    id: serial("id").primaryKey(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => commentsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("comment_reactions_comment_user_uniq").on(t.commentId, t.userId),
  ],
);

export const pollsTable = pgTable(
  "polls",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    question: text("question").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("polls_post_uniq").on(t.postId)],
);

export const pollOptionsTable = pgTable(
  "poll_options",
  {
    id: serial("id").primaryKey(),
    pollId: integer("poll_id")
      .notNull()
      .references(() => pollsTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("poll_options_poll_idx").on(t.pollId)],
);

export const pollVotesTable = pgTable(
  "poll_votes",
  {
    id: serial("id").primaryKey(),
    pollId: integer("poll_id")
      .notNull()
      .references(() => pollsTable.id, { onDelete: "cascade" }),
    optionId: integer("option_id")
      .notNull()
      .references(() => pollOptionsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("poll_votes_poll_user_uniq").on(t.pollId, t.userId)],
);

export const sharesTable = pgTable("shares", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
export type PostMedia = typeof postMediaTable.$inferSelect;
export type PostReaction = typeof postReactionsTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type CommentReaction = typeof commentReactionsTable.$inferSelect;
export type Share = typeof sharesTable.$inferSelect;
export type Poll = typeof pollsTable.$inferSelect;
export type PollOption = typeof pollOptionsTable.$inferSelect;
export type PollVote = typeof pollVotesTable.$inferSelect;
