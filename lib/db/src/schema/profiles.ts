import { pgTable, uuid, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userRoleEnum } from "./enums";

// Profiles are keyed by the Supabase Auth user id (auth.users.id).
export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  bio: text("bio"),
  birthday: date("birthday"),
  location: text("location"),
  work: text("work"),
  education: text("education"),
  hometown: text("hometown"),
  hobbies: text("hobbies"),
  interests: text("interests"),
  website: text("website"),
  isVerified: boolean("is_verified").notNull().default(false),
  // Platform role. Governs admin-panel access and RBAC. Defaults to "user".
  role: userRoleEnum("role").notNull().default("user"),
  // Moderation state (set from the admin panel).
  isSuspended: boolean("is_suspended").notNull().default(false),
  suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
export type UserRole = Profile["role"];
