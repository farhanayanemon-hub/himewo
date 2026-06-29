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
    privacy: privacyEnum("privacy").notNull().default("public"),
    commentsEnabled: boolean("comments_enabled").notNull().default(true),
    reactionsEnabled: boolean("reactions_enabled").notNull().default(true),
    groupId: integer("group_id"),
    pageId: integer("page_id"),
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
