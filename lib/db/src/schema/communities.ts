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
  // About / contact info shown on the page.
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  website: text("website"),
  address: text("address"),
  hours: text("hours"),
  // Configurable call-to-action button. ctaType: none|message|call|shop|signup.
  // ctaUrl holds the external link for shop/signup (message/call derive their
  // target from the owner / contactPhone).
  ctaType: text("cta_type").notNull().default("none"),
  ctaUrl: text("cta_url"),
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

// People (besides the owner) who can manage a page — Facebook-style "Page access".
export const pageMembersTable = pgTable(
  "page_members",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    // editor: can post/edit as the page. (Owner stays pages.created_by.)
    role: text("role").notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("page_members_uniq").on(t.pageId, t.userId)],
);

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

export const pageReviewsTable = pgTable(
  "page_reviews",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    // Star rating, 1-5.
    rating: integer("rating").notNull(),
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // One review per user per page (POST upserts the viewer's own review).
  (t) => [uniqueIndex("page_reviews_uniq").on(t.pageId, t.userId)],
);

export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type Page = typeof pagesTable.$inferSelect;
export type PageFollower = typeof pageFollowersTable.$inferSelect;
export type PageReview = typeof pageReviewsTable.$inferSelect;
