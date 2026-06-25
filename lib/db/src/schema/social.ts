import {
  pgTable,
  serial,
  uuid,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { friendRequestStatusEnum } from "./enums";

export const friendRequestsTable = pgTable(
  "friend_requests",
  {
    id: serial("id").primaryKey(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    status: friendRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("friend_requests_pair_uniq").on(t.requesterId, t.addresseeId),
  ],
);

export const friendshipsTable = pgTable(
  "friendships",
  {
    id: serial("id").primaryKey(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("friendships_pair_uniq").on(t.userAId, t.userBId)],
);

export const followsTable = pgTable(
  "follows",
  {
    id: serial("id").primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("follows_pair_uniq").on(t.followerId, t.followingId)],
);

export type FriendRequest = typeof friendRequestsTable.$inferSelect;
export type Friendship = typeof friendshipsTable.$inferSelect;
export type Follow = typeof followsTable.$inferSelect;
