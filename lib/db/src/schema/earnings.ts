import {
  pgTable,
  serial,
  integer,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { pagesTable } from "./communities";

/**
 * Global configuration for the marketing Points -> Dollars earning system.
 * This is a single-row table (always id = 1). `enabled` is the master switch
 * the admin panel flips; when off the whole feature is invisible to clients.
 *
 * NOTE: This is the *marketing* earning system (points for engagement). It is
 * intentionally separate from any future video-monetization payout system.
 */
export const pointConfigTable = pgTable("point_config", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").notNull().default(true),
  // How many points each rewarded action grants.
  pointsPerPost: integer("points_per_post").notNull().default(10),
  pointsPerLike: integer("points_per_like").notNull().default(1),
  pointsPerComment: integer("points_per_comment").notNull().default(2),
  pointsPerShare: integer("points_per_share").notNull().default(3),
  pointsPerReel: integer("points_per_reel").notNull().default(20),
  // Conversion: how many points equal one US dollar.
  pointsPerDollar: integer("points_per_dollar").notNull().default(1000),
  // Minimum payout (in whole US dollars) a user may request.
  minWithdrawDollars: integer("min_withdraw_dollars").notNull().default(5),
  // Max points a single user can earn per UTC day (0 = no cap).
  dailyPointCap: integer("daily_point_cap").notNull().default(500),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PointConfig = typeof pointConfigTable.$inferSelect;

/**
 * Append-only ledger of every point movement. A user's balance is the SUM of
 * `points` for their rows (earns are positive, withdrawals negative, refunds
 * positive again).
 *
 * The unique index over (userId, action, entityType, entityId) makes earning
 * idempotent: a given user can only ever be rewarded once for a given action
 * on a given entity (e.g. liking post #5). Postgres treats NULLs as distinct,
 * so withdrawals / admin adjustments (which carry no entity) never collide.
 */
export const pointTransactionsTable = pgTable(
  "point_transactions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    // post | like | comment | share | withdraw | withdraw_refund | admin_adjust
    action: text("action").notNull(),
    points: integer("points").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    note: text("note"),
    ip: text("ip"),
    // For admin-initiated ledger movements (admin_adjust from the adjust/reset
    // handlers), the id of the admin who performed the action. Null for the
    // user's own organic earns/withdrawals. This is the audit trail of who
    // touched a balance manually — the most sensitive, real-money lever.
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("point_tx_user_created_idx").on(t.userId, t.createdAt),
    uniqueIndex("point_tx_idem_idx").on(
      t.userId,
      t.action,
      t.entityType,
      t.entityId,
    ),
  ],
);

export type PointTransaction = typeof pointTransactionsTable.$inferSelect;

/**
 * Payout destinations a user has saved (PayPal, Binance, Wise, Bybit, bKash,
 * Nagad). `details` holds the method-specific fields (email, wallet id, phone
 * number, etc.) as a small string map.
 */
export const withdrawalAccountsTable = pgTable(
  "withdrawal_accounts",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    // paypal | binance | wise | bybit | bkash | nagad
    method: text("method").notNull(),
    label: text("label"),
    details: jsonb("details")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("withdrawal_accounts_user_idx").on(t.userId)],
);

export type WithdrawalAccount = typeof withdrawalAccountsTable.$inferSelect;

/**
 * A user request to convert their dollar balance into a real payout. The admin
 * pays MANUALLY out-of-band and then marks the request paid (or rejected, which
 * refunds the spent points). The account `details` are snapshotted at request
 * time so later edits/deletes don't change history.
 */
export const withdrawalRequestsTable = pgTable(
  "withdrawal_requests",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    amountDollars: integer("amount_dollars").notNull(),
    pointsSpent: integer("points_spent").notNull(),
    method: text("method").notNull(),
    details: jsonb("details")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    // pending | approved | paid | rejected
    status: text("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    processedBy: uuid("processed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("withdrawal_requests_user_created_idx").on(t.userId, t.createdAt)],
);

export const insertWithdrawalRequestSchema = createInsertSchema(
  withdrawalRequestsTable,
).omit({ id: true, createdAt: true, processedAt: true });
export type InsertWithdrawalRequest = z.infer<
  typeof insertWithdrawalRequestSchema
>;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;

/**
 * Configured daily tasks users can complete to earn points (manageable by admin).
 */
export const dailyTasksTable = pgTable("daily_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  // reel | post | like | comment | share | custom
  action: text("action").notNull().default("reel"),
  rewardPoints: integer("reward_points").notNull().default(20),
  targetCount: integer("target_count").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DailyTask = typeof dailyTasksTable.$inferSelect;

/**
 * Daily record of claims made by users.
 * Guarantees that a user can only claim a specific task once per UTC date.
 */
export const dailyTaskClaimsTable = pgTable(
  "daily_task_claims",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => dailyTasksTable.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // "YYYY-MM-DD"
    points: integer("points").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("daily_task_claims_user_date_idx").on(t.userId, t.date),
    uniqueIndex("daily_task_claims_unique_claim_idx").on(
      t.userId,
      t.taskId,
      t.date,
    ),
  ],
);

export type DailyTaskClaim = typeof dailyTaskClaimsTable.$inferSelect;

/**
 * Tracks user daily action counters (e.g. reels watched, posts created, likes given).
 */
export const dailyUserActivitiesTable = pgTable(
  "daily_user_activities",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    // reel | post | like | comment | share
    action: text("action").notNull(),
    date: text("date").notNull(), // "YYYY-MM-DD"
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_user_activity_unique_idx").on(
      t.userId,
      t.action,
      t.date,
    ),
  ],
);

export type DailyUserActivity = typeof dailyUserActivitiesTable.$inferSelect;

/**
 * ============================================================================
 * HUB-ONLY CONTENT MONETIZATION SYSTEM (Milestone 1)
 * ============================================================================
 * Exclusively for Hubs (pages). Stores global monetization rates, append-only
 * micro-dollar earnings ledger, and payout withdrawal requests.
 */

/**
 * Global configuration for the Hub-Only Content Monetization system.
 * Single-row table (always id = 1).
 */
export const hubMonetizationConfigTable = pgTable("hub_monetization_config", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").notNull().default(true),
  // Per-format RPM rates in cents per 1,000 qualified views
  postRpmCents: integer("post_rpm_cents").notNull().default(100),
  reelRpmCents: integer("reel_rpm_cents").notNull().default(200),
  videoRpmCents: integer("video_rpm_cents").notNull().default(300),
  liveRpmCents: integer("live_rpm_cents").notNull().default(400),
  // Engagement bonuses in micro-dollars ($0.001 = 1,000 micro-dollars)
  likeMicroDollars: integer("like_micro_dollars").notNull().default(1000),
  commentMicroDollars: integer("comment_micro_dollars").notNull().default(2000),
  shareMicroDollars: integer("share_micro_dollars").notNull().default(5000),
  // Minimum withdrawal threshold in whole US dollars
  minWithdrawDollars: integer("min_withdraw_dollars").notNull().default(20),
  // Daily cap in micro-dollars per Hub ($50.00 = 50,000,000 micro-dollars)
  dailyHubCapMicroDollars: integer("daily_hub_cap_micro_dollars")
    .notNull()
    .default(50000000),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type HubMonetizationConfig =
  typeof hubMonetizationConfigTable.$inferSelect;
export type InsertHubMonetizationConfig =
  typeof hubMonetizationConfigTable.$inferInsert;

/**
 * Append-only ledger tracking micro-dollar credits/debits per Hub.
 * 1 USD = 1,000,000 micro-dollars.
 * Idempotency enforced on (pageId, contentType, contentId, actorId, action, entityId).
 */
export const hubEarningsLedgerTable = pgTable(
  "hub_earnings_ledger",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    contentType: text("content_type")
      .$type<"post" | "reel" | "video" | "live" | "payout">()
      .notNull(),
    contentId: integer("content_id").notNull().default(0),
    actorId: uuid("actor_id").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    action: text("action")
      .$type<
        | "view"
        | "like"
        | "comment"
        | "share"
        | "withdraw"
        | "withdraw_refund"
        | "admin_adjust"
      >()
      .notNull(),
    microDollars: integer("micro_dollars").notNull(),
    entityId: integer("entity_id").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("hub_earnings_page_created_idx").on(t.pageId, t.createdAt),
    uniqueIndex("hub_earnings_idem_idx").on(
      t.pageId,
      t.contentType,
      t.contentId,
      t.actorId,
      t.action,
      t.entityId,
    ),
  ],
);

export type HubEarningsLedger = typeof hubEarningsLedgerTable.$inferSelect;
export type InsertHubEarningsLedger =
  typeof hubEarningsLedgerTable.$inferInsert;
export type HubContentType = "post" | "reel" | "video" | "live" | "payout";
export type HubMonetizationContentType = HubContentType;
export type HubMonetizationAction =
  | "view"
  | "like"
  | "comment"
  | "share"
  | "withdraw"
  | "withdraw_refund"
  | "admin_adjust";

/**
 * Hub withdrawal requests tracking real payout conversion for Hub owners.
 */
export const hubWithdrawalRequestsTable = pgTable(
  "hub_withdrawal_requests",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    amountDollars: integer("amount_dollars").notNull(),
    microDollars: integer("micro_dollars").notNull(),
    method: text("method")
      .$type<"bkash" | "nagad" | "binance" | "paypal" | "wise" | "bybit">()
      .notNull(),
    accountDetails: jsonb("account_details")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: text("status")
      .$type<"pending" | "approved" | "paid" | "rejected">()
      .notNull()
      .default("pending"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("hub_withdrawals_page_created_idx").on(t.pageId, t.createdAt),
    index("hub_withdrawals_status_idx").on(t.status),
  ],
);

export type HubWithdrawalRequest =
  typeof hubWithdrawalRequestsTable.$inferSelect;
export type InsertHubWithdrawalRequest =
  typeof hubWithdrawalRequestsTable.$inferInsert;
export type HubWithdrawalMethod =
  | "bkash"
  | "nagad"
  | "binance"
  | "paypal"
  | "wise"
  | "bybit";
export type HubWithdrawalStatus =
  | "pending"
  | "approved"
  | "paid"
  | "rejected";

export const insertHubWithdrawalRequestSchema = createInsertSchema(
  hubWithdrawalRequestsTable,
).omit({ id: true, createdAt: true, processedAt: true });
export type InsertHubWithdrawalRequestSchema = z.infer<
  typeof insertHubWithdrawalRequestSchema
>;
