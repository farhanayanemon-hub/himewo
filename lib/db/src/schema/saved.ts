import {
  pgTable,
  serial,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const savedItemsTable = pgTable(
  "saved_items",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_items_user_entity_idx").on(
      t.userId,
      t.entityType,
      t.entityId,
    ),
    index("saved_items_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const insertSavedItemSchema = createInsertSchema(savedItemsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type SavedItem = typeof savedItemsTable.$inferSelect;
