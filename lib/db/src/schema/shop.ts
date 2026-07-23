import {
  pgTable,
  serial,
  uuid,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { pagesTable } from "./communities";

// ---------------------------------------------------------------------------
// Shop (managed e-commerce). Replaces the peer-to-peer Marketplace with a
// Stall-per-Hub model: a user opens ONE Stall connected to exactly ONE Hub
// (a page). The Stall has no name of its own — its display name is always the
// connected page's name. All money is stored as integer paisa (BDT cents).
// ---------------------------------------------------------------------------

/**
 * A seller's storefront. Exactly one per user AND one per page (both unique).
 * The stall carries no display name; the connected page (Hub) supplies name +
 * avatar. The owner is `userId`; access to open a stall is gated by
 * canManagePage on `pageId`.
 */
export const shopStallsTable = pgTable(
  "shop_stalls",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    pageId: integer("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    // Seller's business address (shown to buyers, used for physical goods).
    address: text("address").notNull().default(""),
    // physical | digital — digital stalls cannot accept cash-on-delivery.
    productType: text("product_type").notNull().default("physical"),
    contactPhone: text("contact_phone").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("shop_stalls_user_uniq").on(t.userId),
    uniqueIndex("shop_stalls_page_uniq").on(t.pageId),
  ],
);

/**
 * Admin-managed product categories shown as a grid on the shop landing page.
 * `icon` is an emoji (renders everywhere without an icon library).
 */
export const shopCategoriesTable = pgTable(
  "shop_categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("🛍️"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("shop_categories_name_uniq").on(t.name)],
);

/**
 * A product listed under a stall. `priceCents` is integer paisa. Soft-delete
 * (active=false) when the product already has orders; hard-delete otherwise.
 */
export const shopProductsTable = pgTable(
  "shop_products",
  {
    id: serial("id").primaryKey(),
    stallId: integer("stall_id")
      .notNull()
      .references(() => shopStallsTable.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(
      () => shopCategoriesTable.id,
      { onDelete: "set null" },
    ),
    photos: text("photos")
      .array()
      .notNull()
      .default(sql`'{}'`),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    description: text("description").notNull().default(""),
    stockQty: integer("stock_qty").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("shop_products_stall_idx").on(t.stallId, t.id),
    index("shop_products_active_idx").on(t.active),
    index("shop_products_category_idx").on(t.categoryId, t.id),
  ],
);

/**
 * A buyer's order on a single product. Unit price is snapshotted at placement
 * (`unitPriceCents`); `totalCents = unit * quantity`. `heldCents` tracks
 * platform-held funds for verified direct payments. Statuses:
 * awaiting_verification -> pending -> confirmed -> delivered -> completed
 * (or cancelled).
 */
export const shopOrdersTable = pgTable(
  "shop_orders",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => shopProductsTable.id, { onDelete: "restrict" }),
    stallId: integer("stall_id")
      .notNull()
      .references(() => shopStallsTable.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    // Snapshot of product name at order time (product may later be deleted/edited).
    productName: text("product_name").notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    phone: text("phone").notNull(),
    // cod | direct
    paymentMethod: text("payment_method").notNull(),
    // Buyer-submitted transaction id for direct payments.
    paymentRef: text("payment_ref"),
    // Platform-held funds for verified direct payments (0 until verified).
    heldCents: integer("held_cents").notNull().default(0),
    // awaiting_verification | pending | confirmed | delivered | completed | cancelled
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("shop_orders_buyer_idx").on(t.buyerId, t.id),
    index("shop_orders_seller_idx").on(t.sellerId, t.id),
    index("shop_orders_stall_idx").on(t.stallId, t.id),
    index("shop_orders_status_idx").on(t.status),
    index("shop_orders_payment_method_idx").on(t.paymentMethod),
  ],
);

/**
 * Append-only wallet ledger for sellers. A seller's balance is the SUM of
 * `amountCents` over their rows. Separate from the points/earnings system.
 *
 * kind: sale_credit | cod_commission | withdraw | withdraw_refund | admin_adjust
 *  - sale_credit    (+): direct order completion, net of commission.
 *  - cod_commission (-): COD completion commission debit (may go negative).
 *  - withdraw       (-): withdrawal request debit at request time.
 *  - withdraw_refund(+): refund when a withdrawal is rejected.
 *  - admin_adjust   (±): manual admin correction.
 *
 * The unique index over (orderId, kind) WHERE orderId IS NOT NULL makes
 * completion crediting idempotent: a double-confirm cannot double-credit.
 */
export const shopLedgerTable = pgTable(
  "shop_ledger",
  {
    id: serial("id").primaryKey(),
    stallId: integer("stall_id")
      .notNull()
      .references(() => shopStallsTable.id, { onDelete: "cascade" }),
    // Denormalized seller (stall owner) for fast balance sums.
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => shopOrdersTable.id, {
      onDelete: "set null",
    }),
    withdrawalId: integer("withdrawal_id"),
    kind: text("kind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("shop_ledger_seller_idx").on(t.sellerId, t.id),
    index("shop_ledger_stall_idx").on(t.stallId, t.id),
    // Idempotency for order-driven ledger movements (e.g. completion credit).
    uniqueIndex("shop_ledger_order_kind_idx")
      .on(t.orderId, t.kind)
      .where(sql`order_id is not null`),
  ],
);

/**
 * A seller's request to withdraw wallet funds. The ledger is debited at
 * request time; rejection refunds via a positive `withdraw_refund` row. Admin
 * approve = mark paid out (no further ledger move). `details` holds inline
 * payout info { method, accountNumber/phone, note }.
 */
export const shopWithdrawalsTable = pgTable(
  "shop_withdrawals",
  {
    id: serial("id").primaryKey(),
    stallId: integer("stall_id")
      .notNull()
      .references(() => shopStallsTable.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    method: text("method").notNull(),
    details: jsonb("details")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    // pending | approved | rejected
    status: text("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    processedBy: uuid("processed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("shop_withdrawals_seller_created_idx").on(t.sellerId, t.createdAt),
    index("shop_withdrawals_status_idx").on(t.status),
  ],
);

/**
 * A buyer's product review, allowed once per COMPLETED order (unique orderId).
 * `productId`/`stallId` are denormalized for fast aggregate lookups; rating is
 * 1..5 (CHECK enforced at the route layer + DB constraint added via DDL).
 */
export const shopReviewsTable = pgTable(
  "shop_reviews",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => shopOrdersTable.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => shopProductsTable.id, { onDelete: "cascade" }),
    stallId: integer("stall_id")
      .notNull()
      .references(() => shopStallsTable.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("shop_reviews_order_uniq").on(t.orderId),
    index("shop_reviews_product_idx").on(t.productId, t.id),
    index("shop_reviews_stall_idx").on(t.stallId, t.id),
  ],
);

export const insertShopProductSchema = createInsertSchema(
  shopProductsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShopProduct = z.infer<typeof insertShopProductSchema>;

export type ShopStall = typeof shopStallsTable.$inferSelect;
export type ShopCategory = typeof shopCategoriesTable.$inferSelect;
export type ShopProduct = typeof shopProductsTable.$inferSelect;
export type ShopOrder = typeof shopOrdersTable.$inferSelect;
export type ShopLedgerEntry = typeof shopLedgerTable.$inferSelect;
export type ShopWithdrawal = typeof shopWithdrawalsTable.$inferSelect;
export type ShopReview = typeof shopReviewsTable.$inferSelect;
