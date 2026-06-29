import {
  db,
  pointConfigTable,
  pointTransactionsTable,
  type PointConfig,
} from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { logger } from "./logger";

const CONFIG_ID = 1;

/** Actions that grant points (i.e. positive engagement earns). */
export type EarnAction = "post" | "like" | "comment" | "share";
const EARN_ACTIONS: EarnAction[] = ["post", "like", "comment", "share"];

/** Read the single-row config, creating it with defaults on first access. */
export async function getPointConfig(): Promise<PointConfig> {
  const [existing] = await db
    .select()
    .from(pointConfigTable)
    .where(eq(pointConfigTable.id, CONFIG_ID));
  if (existing) return existing;
  const [created] = await db
    .insert(pointConfigTable)
    .values({ id: CONFIG_ID })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [row] = await db
    .select()
    .from(pointConfigTable)
    .where(eq(pointConfigTable.id, CONFIG_ID));
  return row;
}

function pointsForAction(config: PointConfig, action: EarnAction): number {
  switch (action) {
    case "post":
      return config.pointsPerPost;
    case "like":
      return config.pointsPerLike;
    case "comment":
      return config.pointsPerComment;
    case "share":
      return config.pointsPerShare;
  }
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Sum of a user's whole ledger (earns positive, withdrawals negative). */
export async function getBalancePoints(userId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${pointTransactionsTable.points}), 0)::int`,
    })
    .from(pointTransactionsTable)
    .where(eq(pointTransactionsTable.userId, userId));
  return row?.total ?? 0;
}

/** Convert a point amount to whole-cent dollars at the given rate. */
export function pointsToDollars(points: number, pointsPerDollar: number): number {
  if (pointsPerDollar <= 0) return 0;
  return Math.floor((points / pointsPerDollar) * 100) / 100;
}

/**
 * The single choke point for granting engagement points. Mirrors notify.ts:
 *  - No-op when the feature is globally disabled.
 *  - Never rewards acting on your own content.
 *  - Idempotent per (user, action, entity): the unique index means re-doing the
 *    same action (e.g. unlike then like) never double-awards.
 *  - Honors the daily cap.
 *  - Records the requester IP for abuse review.
 * Failures are swallowed so a points hiccup never breaks the underlying action.
 */
export async function awardPoints(params: {
  userId: string;
  action: EarnAction;
  entityType: string;
  entityId: number;
  contentOwnerId?: string;
  ip?: string | null;
}): Promise<void> {
  try {
    if (params.contentOwnerId && params.contentOwnerId === params.userId) return;
    const config = await getPointConfig();
    if (!config.enabled) return;
    const actionPoints = pointsForAction(config, params.action);
    if (actionPoints <= 0) return;
    await db.transaction(async (tx) => {
      // Serialize this user's awards so the daily-cap read and the insert are
      // atomic; two concurrent awards can't both observe the same "earned
      // today" and then each insert past the cap.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${params.userId})::bigint)`,
      );
      let grant = actionPoints;
      if (config.dailyPointCap > 0) {
        const [row] = await tx
          .select({
            total: sql<number>`coalesce(sum(${pointTransactionsTable.points}), 0)::int`,
          })
          .from(pointTransactionsTable)
          .where(
            and(
              eq(pointTransactionsTable.userId, params.userId),
              gte(pointTransactionsTable.createdAt, startOfUtcDay()),
              sql`${pointTransactionsTable.action} in ('post','like','comment','share')`,
            ),
          );
        const remaining = config.dailyPointCap - (row?.total ?? 0);
        if (remaining <= 0) return;
        // Never award beyond the remaining daily allowance.
        grant = Math.min(actionPoints, remaining);
      }
      await tx
        .insert(pointTransactionsTable)
        .values({
          userId: params.userId,
          action: params.action,
          points: grant,
          entityType: params.entityType,
          entityId: params.entityId,
          ip: params.ip ?? null,
        })
        .onConflictDoNothing();
    });
  } catch (err) {
    logger.error({ err, params }, "awardPoints failed");
  }
}

export { EARN_ACTIONS };
