import { Router, type IRouter } from "express";
import {
  db,
  pointConfigTable,
  pointTransactionsTable,
  withdrawalRequestsTable,
  profilesTable,
  type PointConfig,
  type WithdrawalRequest,
  type Profile,
} from "@workspace/db";
import { and, desc, eq, lt, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { toProfile } from "../lib/serialize";
import {
  getPointConfig,
  getBalancePoints,
  pointsToDollars,
} from "../lib/earnings";
import {
  GetAdminEarningsSummaryResponse,
  GetPointConfigResponse,
  UpdatePointConfigBody,
  UpdatePointConfigResponse,
  ListAdminWithdrawalsQueryParams,
  ListAdminWithdrawalsResponse,
  ProcessWithdrawalParams,
  ProcessWithdrawalBody,
  ProcessWithdrawalResponse,
  AdjustUserPointsParams,
  AdjustUserPointsBody,
  AdjustUserPointsResponse,
  ResetUserPointsParams,
  ResetUserPointsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toConfig(row: PointConfig) {
  return {
    enabled: row.enabled,
    pointsPerPost: row.pointsPerPost,
    pointsPerLike: row.pointsPerLike,
    pointsPerComment: row.pointsPerComment,
    pointsPerShare: row.pointsPerShare,
    pointsPerDollar: row.pointsPerDollar,
    minWithdrawDollars: row.minWithdrawDollars,
    dailyPointCap: row.dailyPointCap,
    updatedAt: row.updatedAt,
  };
}

function toAdminWithdrawal(row: WithdrawalRequest, profile: Profile | null) {
  return {
    id: row.id,
    userId: row.userId,
    amountDollars: row.amountDollars,
    pointsSpent: row.pointsSpent,
    method: row.method,
    details: row.details,
    status: row.status,
    adminNote: row.adminNote,
    processedBy: row.processedBy,
    createdAt: row.createdAt,
    processedAt: row.processedAt,
    user: profile ? toProfile(profile) : null,
  };
}

router.get(
  "/admin/earnings/summary",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const config = await getPointConfig();
    // Withdrawal totals: paid out vs. requested-but-not-yet-paid (owed).
    const [withdrawalStats] = await db
      .select({
        totalPaidDollars: sql<number>`coalesce(sum(${withdrawalRequestsTable.amountDollars}) filter (where ${withdrawalRequestsTable.status} = 'paid'), 0)::int`,
        pendingPayoutDollars: sql<number>`coalesce(sum(${withdrawalRequestsTable.amountDollars}) filter (where ${withdrawalRequestsTable.status} in ('pending','approved')), 0)::int`,
        pendingPayoutCount: sql<number>`count(*) filter (where ${withdrawalRequestsTable.status} in ('pending','approved'))::int`,
      })
      .from(withdrawalRequestsTable);
    // Outstanding points = sum of every user's positive ledger balance. This is
    // the live liability owed to users, computed in one pass (no client paging).
    const [outstanding] = await db
      .select({
        points: sql<number>`coalesce(sum(bal), 0)::int`,
      })
      .from(
        sql`(select ${pointTransactionsTable.userId} as uid, sum(${pointTransactionsTable.points}) as bal from ${pointTransactionsTable} group by ${pointTransactionsTable.userId} having sum(${pointTransactionsTable.points}) > 0) as balances`,
      );
    const outstandingPoints = outstanding?.points ?? 0;
    res.json(
      GetAdminEarningsSummaryResponse.parse({
        totalPaidDollars: withdrawalStats?.totalPaidDollars ?? 0,
        pendingPayoutDollars: withdrawalStats?.pendingPayoutDollars ?? 0,
        pendingPayoutCount: withdrawalStats?.pendingPayoutCount ?? 0,
        outstandingPoints,
        outstandingDollars: pointsToDollars(
          outstandingPoints,
          config.pointsPerDollar,
        ),
      }),
    );
  },
);

router.get(
  "/admin/earnings/config",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const config = await getPointConfig();
    res.json(GetPointConfigResponse.parse(toConfig(config)));
  },
);

router.put(
  "/admin/earnings/config",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = UpdatePointConfigBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await getPointConfig();
    const updates = parsed.data;
    const hasUpdates = Object.values(updates).some((v) => v !== undefined);
    if (hasUpdates) {
      await db
        .update(pointConfigTable)
        .set(updates)
        .where(eq(pointConfigTable.id, 1));
    }
    const config = await getPointConfig();
    res.json(UpdatePointConfigResponse.parse(toConfig(config)));
  },
);

router.get(
  "/admin/earnings/withdrawals",
  requireAdmin,
  async (req, res): Promise<void> => {
    const query = ListAdminWithdrawalsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const { status, cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(withdrawalRequestsTable)
      .leftJoin(
        profilesTable,
        eq(withdrawalRequestsTable.userId, profilesTable.id),
      )
      .where(
        and(
          status ? eq(withdrawalRequestsTable.status, status) : undefined,
          cursor ? lt(withdrawalRequestsTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(withdrawalRequestsTable.id))
      .limit(limit ?? 30);
    res.json(
      ListAdminWithdrawalsResponse.parse(
        rows.map((r) =>
          toAdminWithdrawal(r.withdrawal_requests, r.profiles),
        ),
      ),
    );
  },
);

router.post(
  "/admin/earnings/withdrawals/:id/process",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = ProcessWithdrawalParams.safeParse(req.params);
    const parsed = ProcessWithdrawalBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [existing] = await db
      .select()
      .from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Withdrawal not found" });
      return;
    }
    const { status, adminNote } = parsed.data;
    // Allowed source states for each target. A withdrawal flows
    // pending -> approved -> paid; reject (with refund) is allowed from either
    // pending or approved. paid/rejected are terminal.
    const allowedSources: Record<string, string[]> = {
      approved: ["pending"],
      paid: ["pending", "approved"],
      rejected: ["pending", "approved"],
    };
    const sources = allowedSources[status] ?? [];
    if (!sources.includes(existing.status)) {
      res.status(400).json({
        error: `Cannot move withdrawal from ${existing.status} to ${status}`,
      });
      return;
    }
    const processed = await db.transaction(async (tx) => {
      // Atomic state transition: only one concurrent request wins the move from
      // an allowed source state, so we never refund a withdrawal that was also
      // marked paid (or refund twice).
      const updated = await tx
        .update(withdrawalRequestsTable)
        .set({
          status,
          adminNote: adminNote ?? null,
          processedBy: req.userId!,
          processedAt: new Date(),
        })
        .where(
          and(
            eq(withdrawalRequestsTable.id, existing.id),
            inArray(withdrawalRequestsTable.status, sources),
          ),
        )
        .returning({ id: withdrawalRequestsTable.id });
      if (updated.length === 0) return false;
      if (status === "rejected") {
        // Refund the spent points (idempotent per withdrawal via the unique index).
        await tx
          .insert(pointTransactionsTable)
          .values({
            userId: existing.userId,
            action: "withdraw_refund",
            points: existing.pointsSpent,
            entityType: "withdrawal",
            entityId: existing.id,
            note: `Refund for rejected withdrawal #${existing.id}`,
          })
          .onConflictDoNothing();
      }
      return true;
    });
    if (!processed) {
      res.status(400).json({ error: "Withdrawal already processed" });
      return;
    }
    const [row] = await db
      .select()
      .from(withdrawalRequestsTable)
      .leftJoin(
        profilesTable,
        eq(withdrawalRequestsTable.userId, profilesTable.id),
      )
      .where(eq(withdrawalRequestsTable.id, existing.id));
    res.json(
      ProcessWithdrawalResponse.parse(
        toAdminWithdrawal(row.withdrawal_requests, row.profiles),
      ),
    );
  },
);

router.post(
  "/admin/earnings/users/:userId/adjust",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = AdjustUserPointsParams.safeParse(req.params);
    const parsed = AdjustUserPointsBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [profile] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, params.data.userId));
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await db.insert(pointTransactionsTable).values({
      userId: params.data.userId,
      action: "admin_adjust",
      points: parsed.data.points,
      note: parsed.data.note ?? null,
    });
    const config = await getPointConfig();
    const balancePoints = await getBalancePoints(params.data.userId);
    res.json(
      AdjustUserPointsResponse.parse({
        balancePoints,
        balanceDollars: pointsToDollars(balancePoints, config.pointsPerDollar),
      }),
    );
  },
);

router.post(
  "/admin/earnings/users/:userId/reset",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = ResetUserPointsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [profile] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, params.data.userId));
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await db.transaction(async (tx) => {
      // Serialize with awardPoints (same advisory-lock key) so the balance read
      // and the zeroing entry are atomic against concurrent earns.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${params.data.userId})::bigint)`,
      );
      const [row] = await tx
        .select({
          total: sql<number>`coalesce(sum(${pointTransactionsTable.points}), 0)::int`,
        })
        .from(pointTransactionsTable)
        .where(eq(pointTransactionsTable.userId, params.data.userId));
      const balance = row?.total ?? 0;
      if (balance !== 0) {
        await tx.insert(pointTransactionsTable).values({
          userId: params.data.userId,
          action: "admin_adjust",
          points: -balance,
          note: "Admin reset balance to zero",
        });
      }
    });
    const config = await getPointConfig();
    const balancePoints = await getBalancePoints(params.data.userId);
    res.json(
      ResetUserPointsResponse.parse({
        balancePoints,
        balanceDollars: pointsToDollars(balancePoints, config.pointsPerDollar),
      }),
    );
  },
);

export default router;
