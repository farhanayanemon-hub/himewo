import {
  pgTable,
  serial,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";

export const liveStreamsTable = pgTable(
  "live_streams",
  {
    id: serial("id").primaryKey(),
    hostId: uuid("host_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("live_streams_host_idx").on(t.hostId)],
);

export type LiveStreamRow = typeof liveStreamsTable.$inferSelect;
