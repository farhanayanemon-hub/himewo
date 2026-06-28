import {
  pgTable,
  serial,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const marketplaceListingsTable = pgTable(
  "marketplace_listings",
  {
    id: serial("id").primaryKey(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    price: integer("price").notNull().default(0),
    currency: text("currency").notNull().default("BDT"),
    category: text("category").notNull().default("other"),
    condition: text("condition").notNull().default("used_good"),
    description: text("description").notNull().default(""),
    location: text("location"),
    photos: text("photos")
      .array()
      .notNull()
      .default(sql`'{}'`),
    status: text("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("marketplace_seller_created_idx").on(t.sellerId, t.createdAt),
    index("marketplace_category_idx").on(t.category),
  ],
);

export const insertMarketplaceListingSchema = createInsertSchema(
  marketplaceListingsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketplaceListing = z.infer<
  typeof insertMarketplaceListingSchema
>;
export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
