import { Router, type IRouter } from "express";
import {
  db,
  pointTransactionsTable,
  withdrawalAccountsTable,
  withdrawalRequestsTable,
  type PointTransaction,
  type WithdrawalAccount,
  type WithdrawalRequest,
} from "@workspace/db";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  getPointConfig,
  getBalancePoints,
  pointsToDollars,
} from "../lib/earnings";
import {
  GetEarningsSummaryResponse,
  GetEarningsHistoryQueryParams,
  GetEarningsHistoryResponse,
  ListWithdrawalAccountsResponse,
  AddWithdrawalAccountBody,
  AddWithdrawalAccountResponse,
  DeleteWithdrawalAccountParams,
  ListMyWithdrawalsResponse,
  CreateWithdrawalBody,
  CreateWithdrawalResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toTransaction(row: PointTransaction) {
  return {
    id: row.id,
    action: row.action,
    points: row.points,
    entityType: row.entityType,
    entityId: row.entityId,
    note: row.note,
    createdAt: row.createdAt,
  };
}

function toAccount(row: WithdrawalAccount) {
  return {
    id: row.id,
    method: row.method,
    label: row.label,
    details: row.details,
    createdAt: row.createdAt,
  };
}

function toWithdrawal(row: WithdrawalRequest) {
  return {
    id: row.id,
    amountDollars: row.amountDollars,
    pointsSpent: row.pointsSpent,
    method: row.method,
    details: row.details,
    status: row.status,
    adminNote: row.adminNote,
    createdAt: row.createdAt,
    processedAt: row.processedAt,
  };
}

async function sumEarned(userId: string, since?: Date): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${pointTransactionsTable.points}), 0)::int`,
    })
    .from(pointTransactionsTable)
    .where(
      and(
        eq(pointTransactionsTable.userId, userId),
        sql`${pointTransactionsTable.action} in ('post','like','comment','share')`,
        since ? gte(pointTransactionsTable.createdAt, since) : undefined,
      ),
    );
  return row?.total ?? 0;
}

router.get("/earnings/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const config = await getPointConfig();
  const rewards = {
    post: config.pointsPerPost,
    like: config.pointsPerLike,
    comment: config.pointsPerComment,
    share: config.pointsPerShare,
  };
  if (!config.enabled) {
    res.json(
      GetEarningsSummaryResponse.parse({
        enabled: false,
        balancePoints: 0,
        balanceDollars: 0,
        pointsPerDollar: config.pointsPerDollar,
        minWithdrawDollars: config.minWithdrawDollars,
        dailyPointCap: config.dailyPointCap,
        todayPoints: 0,
        monthPoints: 0,
        totalEarnedPoints: 0,
        pendingWithdrawalDollars: 0,
        rewards,
      }),
    );
    return;
  }

  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const balancePoints = await getBalancePoints(userId);
  const todayPoints = await sumEarned(userId, dayStart);
  const monthPoints = await sumEarned(userId, monthStart);
  const totalEarnedPoints = await sumEarned(userId);
  const [pending] = await db
    .select({
      total: sql<number>`coalesce(sum(${withdrawalRequestsTable.amountDollars}), 0)::int`,
    })
    .from(withdrawalRequestsTable)
    .where(
      and(
        eq(withdrawalRequestsTable.userId, userId),
        eq(withdrawalRequestsTable.status, "pending"),
      ),
    );

  res.json(
    GetEarningsSummaryResponse.parse({
      enabled: true,
      balancePoints,
      balanceDollars: pointsToDollars(balancePoints, config.pointsPerDollar),
      pointsPerDollar: config.pointsPerDollar,
      minWithdrawDollars: config.minWithdrawDollars,
      dailyPointCap: config.dailyPointCap,
      todayPoints,
      monthPoints,
      totalEarnedPoints,
      pendingWithdrawalDollars: pending?.total ?? 0,
      rewards,
    }),
  );
});

router.get("/earnings/history", requireAuth, async (req, res): Promise<void> => {
  const query = GetEarningsHistoryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const config = await getPointConfig();
  if (!config.enabled) {
    res.status(403).json({ error: "Earnings are turned off" });
    return;
  }
  const { cursor, limit } = query.data;
  const rows = await db
    .select()
    .from(pointTransactionsTable)
    .where(
      and(
        eq(pointTransactionsTable.userId, req.userId!),
        cursor ? lt(pointTransactionsTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(pointTransactionsTable.id))
    .limit(limit ?? 30);
  res.json(GetEarningsHistoryResponse.parse(rows.map(toTransaction)));
});

router.get(
  "/earnings/withdrawal-accounts",
  requireAuth,
  async (req, res): Promise<void> => {
    const config = await getPointConfig();
    if (!config.enabled) {
      res.status(403).json({ error: "Earnings are turned off" });
      return;
    }
    const rows = await db
      .select()
      .from(withdrawalAccountsTable)
      .where(eq(withdrawalAccountsTable.userId, req.userId!))
      .orderBy(desc(withdrawalAccountsTable.id));
    res.json(ListWithdrawalAccountsResponse.parse(rows.map(toAccount)));
  },
);

router.post(
  "/earnings/withdrawal-accounts",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = AddWithdrawalAccountBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const config = await getPointConfig();
    if (!config.enabled) {
      res.status(403).json({ error: "Earnings are turned off" });
      return;
    }
    const [row] = await db
      .insert(withdrawalAccountsTable)
      .values({
        userId: req.userId!,
        method: parsed.data.method,
        label: parsed.data.label ?? null,
        details: parsed.data.details,
      })
      .returning();
    res.status(201).json(AddWithdrawalAccountResponse.parse(toAccount(row)));
  },
);

router.delete(
  "/earnings/withdrawal-accounts/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteWithdrawalAccountParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const config = await getPointConfig();
    if (!config.enabled) {
      res.status(403).json({ error: "Earnings are turned off" });
      return;
    }
    const deleted = await db
      .delete(withdrawalAccountsTable)
      .where(
        and(
          eq(withdrawalAccountsTable.id, params.data.id),
          eq(withdrawalAccountsTable.userId, req.userId!),
        ),
      )
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.sendStatus(204);
  },
);

router.get(
  "/earnings/withdrawals",
  requireAuth,
  async (req, res): Promise<void> => {
    const config = await getPointConfig();
    if (!config.enabled) {
      res.status(403).json({ error: "Earnings are turned off" });
      return;
    }
    const rows = await db
      .select()
      .from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.userId, req.userId!))
      .orderBy(desc(withdrawalRequestsTable.id));
    res.json(ListMyWithdrawalsResponse.parse(rows.map(toWithdrawal)));
  },
);

router.post(
  "/earnings/withdrawals",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = CreateWithdrawalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const userId = req.userId!;
    const config = await getPointConfig();
    if (!config.enabled) {
      res.status(403).json({ error: "Earnings are turned off" });
      return;
    }
    const { amountDollars, accountId } = parsed.data;
    if (amountDollars < config.minWithdrawDollars) {
      res.status(400).json({
        error: `Minimum withdrawal is $${config.minWithdrawDollars}`,
      });
      return;
    }
    const [account] = await db
      .select()
      .from(withdrawalAccountsTable)
      .where(
        and(
          eq(withdrawalAccountsTable.id, accountId),
          eq(withdrawalAccountsTable.userId, userId),
        ),
      );
    if (!account) {
      res.status(400).json({ error: "Payout account not found" });
      return;
    }
    const pointsNeeded = amountDollars * config.pointsPerDollar;
    const created = await db.transaction(async (tx) => {
      // Serialize concurrent withdrawals for this user so two requests can't
      // both pass the balance check and overspend the ledger.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`,
      );
      const [bal] = await tx
        .select({
          total: sql<number>`coalesce(sum(${pointTransactionsTable.points}), 0)::int`,
        })
        .from(pointTransactionsTable)
        .where(eq(pointTransactionsTable.userId, userId));
      if ((bal?.total ?? 0) < pointsNeeded) return null;
      const [request] = await tx
        .insert(withdrawalRequestsTable)
        .values({
          userId,
          amountDollars,
          pointsSpent: pointsNeeded,
          method: account.method,
          details: account.details,
          status: "pending",
        })
        .returning();
      await tx.insert(pointTransactionsTable).values({
        userId,
        action: "withdraw",
        points: -pointsNeeded,
        entityType: "withdrawal",
        entityId: request.id,
        note: `Withdrawal request #${request.id} ($${amountDollars})`,
      });
      return request;
    });
    if (!created) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    res.status(201).json(CreateWithdrawalResponse.parse(toWithdrawal(created)));
  },
);

export default router;
