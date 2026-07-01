import {
  pgTable,
  serial,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { postsTable } from "./posts";
import { memberRoleEnum, groupMemberStatusEnum, privacyEnum } from "./enums";

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  privacy: privacyEnum("privacy").notNull().default("public"),
  // Group rules shown to members.
  rules: text("rules"),
  // When true, member posts require admin/mod approval before appearing.
  requirePostApproval: boolean("require_post_approval")
    .notNull()
    .default(false),
  // Optional questions asked when a user requests to join.
  joinQuestions: jsonb("join_questions").$type<string[]>(),
  // Announcement post pinned to the top of the group feed.
  pinnedPostId: integer("pinned_post_id").references(() => postsTable.id, {
    onDelete: "set null",
  }),
  // Admin curation/governance flags.
  featured: boolean("featured").notNull().default(false),
  isApproved: boolean("is_approved").notNull().default(true),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groupMembersTable = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groupsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    // active = full member, pending = awaiting approval, banned = blocked.
    status: groupMemberStatusEnum("status").notNull().default("active"),
    // Muted members stay in the group but cannot post.
    isMuted: boolean("is_muted").notNull().default(false),
    // Answers to the group's join questions (given at request time).
    answers: jsonb("answers").$type<string[]>(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("group_members_uniq").on(t.groupId, t.userId)],
);

export const pagesTable = pgTable("pages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  // Admin curation/governance flags.
  featured: boolean("featured").notNull().default(false),
  isApproved: boolean("is_approved").notNull().default(true),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pageFollowersTable = pgTable(
  "page_followers",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("page_followers_uniq").on(t.pageId, t.userId)],
);

export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type Page = typeof pagesTable.$inferSelect;
export type PageFollower = typeof pageFollowersTable.$inferSelect;
