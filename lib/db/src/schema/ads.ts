import {
  pgTable,
  serial,
  integer,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

// ---------------------------------------------------------------------------
// Facebook-style ads system (ads.himewo.com).
//
// Hierarchy: Ad Account -> Campaign -> Ad Set -> Ad. The Ad Account is the
// billing container (wallet balance + team members). All money is stored as
// integer CENTS (never floats) to keep payouts/charges exact. Status/role
// fields are plain text columns (validated by Zod at the API edge) instead of
// pgEnum so the live DB can be migrated with pure additive CREATE TABLE — no
// CREATE TYPE step required.
//
// This task builds the DATA MODEL + management API only. Serving ads,
// payments/money-movement, approval UI and analytics come in later tasks; the
// tracking tables (impressions/clicks/conversions) are created here ready for
// those phases.
// ---------------------------------------------------------------------------

// Roles a member can hold on an ad account:
//   admin      - full control (billing, members, everything)
//   advertiser - manage campaigns/ad sets/ads/creatives/audiences/schedules
//   analyst    - read-only
export type AdRole = "admin" | "advertiser" | "analyst";

/** The billing container. Owns a wallet balance and a team of members. */
export const adAccountsTable = pgTable(
  "ad_accounts",
  {
    id: serial("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    timezone: text("timezone").notNull().default("UTC"),
    // Cached wallet balance in cents. The append-only ledger
    // (ad_wallet_transactions) is the source of truth; this column is a fast
    // read cache maintained by the Payments task.
    balanceCents: integer("balance_cents").notNull().default(0),
    // active | suspended | closed
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("ad_accounts_owner_idx").on(t.ownerId)],
);

export const insertAdAccountSchema = createInsertSchema(adAccountsTable).omit({
  id: true,
  balanceCents: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdAccount = z.infer<typeof insertAdAccountSchema>;
export type AdAccount = typeof adAccountsTable.$inferSelect;

/** Team membership + role on an ad account. Owner is implicitly admin. */
export const adAccountMembersTable = pgTable(
  "ad_account_members",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => adAccountsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    // admin | advertiser | analyst
    role: text("role").notNull().default("advertiser"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ad_account_members_uniq_idx").on(t.accountId, t.userId),
    index("ad_account_members_user_idx").on(t.userId),
  ],
);

export type AdAccountMember = typeof adAccountMembersTable.$inferSelect;

/** Top-level campaign under an account. Holds the objective + optional budget. */
export const adCampaignsTable = pgTable(
  "ad_campaigns",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => adAccountsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // awareness | traffic | engagement | leads | sales | app_promotion |
    // page_boost | post_boost
    objective: text("objective").notNull().default("traffic"),
    // draft | active | paused | completed | archived
    status: text("status").notNull().default("draft"),
    dailyBudgetCents: integer("daily_budget_cents"),
    lifetimeBudgetCents: integer("lifetime_budget_cents"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("ad_campaigns_account_idx").on(t.accountId),
    check(
      "ad_campaigns_budget_nonneg",
      sql`(${t.dailyBudgetCents} is null or ${t.dailyBudgetCents} >= 0) and (${t.lifetimeBudgetCents} is null or ${t.lifetimeBudgetCents} >= 0)`,
    ),
  ],
);

export type AdCampaign = typeof adCampaignsTable.$inferSelect;

/** Ad set: targeting + budget + flight dates, under a campaign. */
export const adSetsTable = pgTable(
  "ad_sets",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => adCampaignsTable.id, { onDelete: "cascade" }),
    // Denormalized for cheap authz + account-scoped queries.
    accountId: integer("account_id")
      .notNull()
      .references(() => adAccountsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // draft | active | paused | completed | archived
    status: text("status").notNull().default("draft"),
    dailyBudgetCents: integer("daily_budget_cents"),
    lifetimeBudgetCents: integer("lifetime_budget_cents"),
    // impressions | clicks
    billingEvent: text("billing_event").notNull().default("impressions"),
    // reach | link_clicks | engagement | conversions
    optimizationGoal: text("optimization_goal").notNull().default("reach"),
    // Optional reusable audience; targeting row still holds the effective spec.
    savedAudienceId: integer("saved_audience_id"),
    // Overall flight window (dayparting lives in ad_schedules).
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("ad_sets_campaign_idx").on(t.campaignId),
    index("ad_sets_account_idx").on(t.accountId),
    check(
      "ad_sets_budget_nonneg",
      sql`(${t.dailyBudgetCents} is null or ${t.dailyBudgetCents} >= 0) and (${t.lifetimeBudgetCents} is null or ${t.lifetimeBudgetCents} >= 0)`,
    ),
  ],
);

export type AdSet = typeof adSetsTable.$inferSelect;

// Shared targeting spec shape (also used by saved audiences).
export type AdTargetingSpec = {
  locations?: string[];
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  interests?: string[];
  languages?: string[];
  custom?: Record<string, unknown>;
};

/** Effective targeting for an ad set (1:1). */
export const adTargetingTable = pgTable(
  "ad_targeting",
  {
    id: serial("id").primaryKey(),
    adSetId: integer("ad_set_id")
      .notNull()
      .references(() => adSetsTable.id, { onDelete: "cascade" }),
    locations: text("locations")
      .array()
      .notNull()
      .default(sql`'{}'`),
    ageMin: integer("age_min"),
    ageMax: integer("age_max"),
    genders: text("genders")
      .array()
      .notNull()
      .default(sql`'{}'`),
    interests: text("interests")
      .array()
      .notNull()
      .default(sql`'{}'`),
    languages: text("languages")
      .array()
      .notNull()
      .default(sql`'{}'`),
    custom: jsonb("custom").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("ad_targeting_ad_set_uniq_idx").on(t.adSetId)],
);

export type AdTargeting = typeof adTargetingTable.$inferSelect;

/** Reusable audience saved at account level. */
export const adSavedAudiencesTable = pgTable(
  "ad_saved_audiences",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => adAccountsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    spec: jsonb("spec").$type<AdTargetingSpec>().notNull().default({}),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("ad_saved_audiences_account_idx").on(t.accountId)],
);

export type AdSavedAudience = typeof adSavedAudiencesTable.$inferSelect;

/**
 * Dayparting slot for an ad set. `dayOfWeek` 0-6 (Sun-Sat) or null for every
 * day; `startMinute`/`endMinute` are minutes-from-midnight in the account tz.
 */
export const adSchedulesTable = pgTable(
  "ad_schedules",
  {
    id: serial("id").primaryKey(),
    adSetId: integer("ad_set_id")
      .notNull()
      .references(() => adSetsTable.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week"),
    startMinute: integer("start_minute").notNull().default(0),
    endMinute: integer("end_minute").notNull().default(1440),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ad_schedules_ad_set_idx").on(t.adSetId),
    check(
      "ad_schedules_minutes_valid",
      sql`${t.startMinute} >= 0 and ${t.endMinute} <= 1440 and ${t.startMinute} < ${t.endMinute} and (${t.dayOfWeek} is null or (${t.dayOfWeek} >= 0 and ${t.dayOfWeek} <= 6))`,
    ),
  ],
);

export type AdSchedule = typeof adSchedulesTable.$inferSelect;

/** A reusable creative (copy + media + CTA) at account level. */
export const adCreativesTable = pgTable(
  "ad_creatives",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => adAccountsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // single_image | video | carousel
    format: text("format").notNull().default("single_image"),
    headline: text("headline"),
    primaryText: text("primary_text"),
    description: text("description"),
    // learn_more | shop_now | sign_up | book_now | contact_us | download | none
    callToAction: text("call_to_action").notNull().default("learn_more"),
    // http(s) media urls (validated at the API edge).
    mediaUrls: text("media_urls")
      .array()
      .notNull()
      .default(sql`'{}'`),
    // http(s) destination (validated at the API edge to block javascript:/data:).
    linkUrl: text("link_url"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("ad_creatives_account_idx").on(t.accountId)],
);

export type AdCreative = typeof adCreativesTable.$inferSelect;

/** A single ad under an ad set. Review lifecycle handled by the Admin task. */
export const adsTable = pgTable(
  "ads",
  {
    id: serial("id").primaryKey(),
    adSetId: integer("ad_set_id")
      .notNull()
      .references(() => adSetsTable.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => adAccountsTable.id, { onDelete: "cascade" }),
    creativeId: integer("creative_id").references(() => adCreativesTable.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    // draft | in_review | active | paused | archived
    status: text("status").notNull().default("draft"),
    // pending | approved | rejected (set by the Admin approval task)
    reviewStatus: text("review_status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // http(s) destination (validated at the API edge).
    destinationUrl: text("destination_url"),
    // When this ad was created by "Boost Post" / "Boost Page" it points at the
    // boosted post/page so serving can embed the real content. Plain integer
    // (no FK) — a deleted post/page just makes the ad unservable (skipped).
    boostedPostId: integer("boosted_post_id"),
    boostedPageId: integer("boosted_page_id"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("ads_ad_set_idx").on(t.adSetId),
    index("ads_account_idx").on(t.accountId),
    index("ads_review_status_idx").on(t.reviewStatus),
  ],
);

export type Ad = typeof adsTable.$inferSelect;

/**
 * Append-only wallet ledger. Balance = SUM(amount_cents). Positive = money in
 * (topup/credit/refund), negative = money out (charge). Money-movement logic
 * lives in the Payments task; the table is readable now.
 */
export const adWalletTransactionsTable = pgTable(
  "ad_wallet_transactions",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => adAccountsTable.id, { onDelete: "cascade" }),
    // topup | charge | refund | credit | adjustment
    type: text("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    // Balance snapshot after this entry (set by the Payments task).
    balanceAfterCents: integer("balance_after_cents"),
    description: text("description"),
    // External reference (e.g. Stripe payment intent id).
    referenceId: text("reference_id"),
    couponId: integer("coupon_id"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ad_wallet_tx_account_created_idx").on(t.accountId, t.createdAt),
    check("ad_wallet_tx_amount_nonzero", sql`${t.amountCents} <> 0`),
  ],
);

export type AdWalletTransaction = typeof adWalletTransactionsTable.$inferSelect;

/** Ad credit / coupon record. Redemption logic comes in the Payments task. */
export const adCouponsTable = pgTable(
  "ad_coupons",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    // active | redeemed | expired | disabled
    status: text("status").notNull().default("active"),
    // Set when redeemed against an account.
    accountId: integer("account_id").references(() => adAccountsTable.id, {
      onDelete: "set null",
    }),
    redeemedBy: uuid("redeemed_by"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    note: text("note"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ad_coupons_code_uniq_idx").on(t.code),
    index("ad_coupons_account_idx").on(t.accountId),
    check("ad_coupons_amount_positive", sql`${t.amountCents} > 0`),
  ],
);

export type AdCoupon = typeof adCouponsTable.$inferSelect;

// ---------------------------------------------------------------------------
// Tracking tables — created now, wired up by the Serving / Analytics tasks.
// ---------------------------------------------------------------------------

/** One row per ad impression. */
export const adImpressionsTable = pgTable(
  "ad_impressions",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => adsTable.id, { onDelete: "cascade" }),
    accountId: integer("account_id").notNull(),
    viewerId: uuid("viewer_id").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    // feed | reels | stories | sidebar | ...
    placement: text("placement"),
    costCents: integer("cost_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ad_impressions_ad_created_idx").on(t.adId, t.createdAt)],
);

export type AdImpression = typeof adImpressionsTable.$inferSelect;

/** One row per ad click. */
export const adClicksTable = pgTable(
  "ad_clicks",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => adsTable.id, { onDelete: "cascade" }),
    accountId: integer("account_id").notNull(),
    viewerId: uuid("viewer_id").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    placement: text("placement"),
    costCents: integer("cost_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ad_clicks_ad_created_idx").on(t.adId, t.createdAt)],
);

export type AdClick = typeof adClicksTable.$inferSelect;

/** Conversion / pixel event. Capture endpoints are wired in the Analytics task. */
export const adConversionsTable = pgTable(
  "ad_conversions",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id").references(() => adsTable.id, {
      onDelete: "set null",
    }),
    accountId: integer("account_id"),
    // Pixel identifier the event was reported against.
    pixelId: text("pixel_id"),
    // purchase | lead | signup | add_to_cart | ...
    eventName: text("event_name").notNull(),
    valueCents: integer("value_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    viewerId: uuid("viewer_id").references(() => profilesTable.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ad_conversions_account_created_idx").on(t.accountId, t.createdAt)],
);

export type AdConversion = typeof adConversionsTable.$inferSelect;
