import {
  pgTable,
  serial,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profilesTable } from "./profiles";
import {
  reportStatusEnum,
  reportTargetTypeEnum,
  announcementLevelEnum,
  verificationStatusEnum,
  userRoleEnum,
} from "./enums";

// ---------------------------------------------------------------------------
// Reports & flags (D, J). Fed by report buttons in the apps.
// ---------------------------------------------------------------------------
export const reportsTable = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reporterId: uuid("reporter_id").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    targetType: reportTargetTypeEnum("target_type").notNull(),
    // text so it can hold a uuid (user) or a numeric id (post/comment/reel/story).
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("open"),
    handledBy: uuid("handled_by").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("reports_status_created_idx").on(t.status, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Audit log (I). Every mutating admin action writes one row.
// ---------------------------------------------------------------------------
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: uuid("actor_id").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// Feature flags & site settings (G). Read by the main app to gate features
// and maintenance mode.
// ---------------------------------------------------------------------------
export const featureFlagsTable = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => profilesTable.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const siteSettingsTable = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedBy: uuid("updated_by").references(() => profilesTable.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// Announcements (F). Broadcast a banner/notification to all users.
// ---------------------------------------------------------------------------
export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  level: announcementLevelEnum("level").notNull().default("info"),
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by").references(() => profilesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Verification requests (J). Blue-tick queue.
// ---------------------------------------------------------------------------
export const verificationRequestsTable = pgTable(
  "verification_requests",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    note: text("note"),
    status: verificationStatusEnum("status").notNull().default("pending"),
    handledBy: uuid("handled_by").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // At most ONE pending request per user — the POST route's pre-check is
    // advisory; this is the real guard against double-submit races.
    uniqueIndex("verification_requests_one_pending_idx")
      .on(t.userId)
      .where(sql`status = 'pending'`),
  ],
);

// ---------------------------------------------------------------------------
// RBAC (H). Per-role permission lists. The "admin" role implicitly has all
// permissions; this table scopes moderator/support and any custom tuning.
// ---------------------------------------------------------------------------
export const rolePermissionsTable = pgTable("role_permissions", {
  role: userRoleEnum("role").primaryKey(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  updatedBy: uuid("updated_by").references(() => profilesTable.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Report = typeof reportsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type FeatureFlag = typeof featureFlagsTable.$inferSelect;
export type SiteSetting = typeof siteSettingsTable.$inferSelect;
export type Announcement = typeof announcementsTable.$inferSelect;
export type VerificationRequest = typeof verificationRequestsTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
