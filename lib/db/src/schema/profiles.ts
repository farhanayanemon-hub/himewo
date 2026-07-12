import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userRoleEnum } from "./enums";

// Profiles are keyed by the Supabase Auth user id (auth.users.id).
export const profilesTable = pgTable(
  "profiles",
  {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  // Split name parts captured by the signup wizard (displayName stays the
  // rendered full name everywhere).
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: text("gender"),
  // ISO 3166-1 alpha-2 country code captured at signup (picker or IP detect).
  country: text("country"),
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
  // FB-style rename cooldowns. Null = never changed since signup (first change is free).
  usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
  displayNameChangedAt: timestamp("display_name_changed_at", {
    withTimezone: true,
  }),
  // Null = new signup that hasn't finished (or skipped through) the one-time
  // post-signup onboarding flow yet. Backfilled to now() for pre-existing users.
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
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
  },
  (t) => [
    // Case-insensitive uniqueness: "John" and "john" are the same username.
    uniqueIndex("profiles_username_lower_idx").on(sql`lower(${t.username})`),
  ],
);

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
export type UserRole = Profile["role"];
