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
import { profilesTable } from "./profiles";
import { mediaTypeEnum, notificationTypeEnum, reactionTypeEnum } from "./enums";

export const storiesTable = pgTable("stories", {
  id: serial("id").primaryKey(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  // When set, the story is posted AS this page (Facebook-style "acting as page").
  pageId: integer("page_id"),
  // "media" (photo/video/GIF) or "text" (colored-background text story).
  storyType: text("story_type").notNull().default("media"),
  mediaUrl: text("media_url"),
  mediaType: mediaTypeEnum("media_type"),
  caption: text("caption"),
  // Text story fields.
  textContent: text("text_content"),
  backgroundStyle: text("background_style"),
  // Optional music attached to the story.
  musicUrl: text("music_url"),
  musicTitle: text("music_title"),
  musicArtist: text("music_artist"),
  // Moderation flag (managed from the admin panel).
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const musicTracksTable = pgTable("music_tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  url: text("url").notNull(),
  mood: text("mood"),
  // "library" = curated royalty-free track, "upload" = user-uploaded audio.
  source: text("source").notNull().default("library"),
  uploadedBy: uuid("uploaded_by").references(() => profilesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const storyViewsTable = pgTable(
  "story_views",
  {
    id: serial("id").primaryKey(),
    storyId: integer("story_id")
      .notNull()
      .references(() => storiesTable.id, { onDelete: "cascade" }),
    viewerId: uuid("viewer_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("story_views_uniq").on(t.storyId, t.viewerId)],
);

export const reelsTable = pgTable("reels", {
  id: serial("id").primaryKey(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  // Moderation / curation flags (managed from the admin panel).
  hidden: boolean("hidden").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reelLikesTable = pgTable(
  "reel_likes",
  {
    id: serial("id").primaryKey(),
    reelId: integer("reel_id")
      .notNull()
      .references(() => reelsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull().default("like"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("reel_likes_uniq").on(t.reelId, t.userId)],
);

export const reelCommentsTable = pgTable("reel_comments", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id")
    .notNull()
    .references(() => reelsTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profilesTable.id, {
      onDelete: "cascade",
    }),
    type: notificationTypeEnum("type").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

export type Story = typeof storiesTable.$inferSelect;
export type MusicTrack = typeof musicTracksTable.$inferSelect;
export type StoryView = typeof storyViewsTable.$inferSelect;
export type Reel = typeof reelsTable.$inferSelect;
export type ReelLike = typeof reelLikesTable.$inferSelect;
export type ReelComment = typeof reelCommentsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
