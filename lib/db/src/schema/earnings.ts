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
  enabled: boolean("enabled").notNull().default(false),
  // How many points each rewarded action grants.
  pointsPerPost: integer("points_per_post").notNull().default(10),
  pointsPerLike: integer("points_per_like").notNull().default(1),
  pointsPerComment: integer("points_per_comment").notNull().default(2),
  pointsPerShare: integer("points_per_share").notNull().default(3),
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
