import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const userSettingsTable = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),

  // Privacy
  profileVisibility: text("profile_visibility").notNull().default("public"),
  postVisibility: text("post_visibility").notNull().default("public"),
  friendRequestPrivacy: text("friend_request_privacy")
    .notNull()
    .default("everyone"),
  showOnlineStatus: boolean("show_online_status").notNull().default(true),
  isLocked: boolean("is_locked").notNull().default(false),

  // Notifications
  notifyLikes: boolean("notify_likes").notNull().default(true),
  notifyComments: boolean("notify_comments").notNull().default(true),
  notifyFriendRequests: boolean("notify_friend_requests")
    .notNull()
    .default(true),
  notifyMessages: boolean("notify_messages").notNull().default(true),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  pushNotifications: boolean("push_notifications").notNull().default(true),

  // Preferences
  language: text("language").notNull().default("banglish"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSettingsSchema = createInsertSchema(
  userSettingsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
