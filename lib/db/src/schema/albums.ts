import {
  pgTable,
  serial,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";

export const albumsTable = pgTable(
  "albums",
  {
    id: serial("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // "custom" = user-created; "profile" / "cover" = FB-style auto-albums that
    // collect every profile picture / cover photo change automatically.
    kind: text("kind").notNull().default("custom"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("albums_owner_idx").on(t.ownerId, t.createdAt)],
);

export const albumPhotosTable = pgTable(
  "album_photos",
  {
    id: serial("id").primaryKey(),
    albumId: integer("album_id")
      .notNull()
      .references(() => albumsTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("album_photos_album_idx").on(t.albumId, t.createdAt)],
);

export const photoTagsTable = pgTable(
  "photo_tags",
  {
    id: serial("id").primaryKey(),
    photoId: integer("photo_id")
      .notNull()
      .references(() => albumPhotosTable.id, { onDelete: "cascade" }),
    taggedUserId: uuid("tagged_user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    taggerId: uuid("tagger_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("photo_tags_uniq").on(t.photoId, t.taggedUserId)],
);

export type Album = typeof albumsTable.$inferSelect;
export type AlbumPhoto = typeof albumPhotosTable.$inferSelect;
export type PhotoTag = typeof photoTagsTable.$inferSelect;
