import { Router, type IRouter } from "express";
import {
  db,
  pagesTable,
  pageFollowersTable,
  profilesTable,
  postsTable,
  reelsTable,
  liveStreamsTable,
  hubMonetizationConfigTable,
  hubEarningsLedgerTable,
  hubWithdrawalRequestsTable,
  type HubWithdrawalMethod,
  type HubWithdrawalStatus,
} from "@workspace/db";
import { sql, eq, and, desc, count, inArray, isNull } from "drizzle-orm";
import { requireAuth, requireAdmin, authMiddleware } from "../lib/auth";
import { canManagePage } from "../lib/authz";
import {
  ensureHubMonetizationSchema,
  getHubMonetizationConfig,
  updateHubMonetizationConfig,
  awardHubContentEvent,
  getHubMonetizationStudioData,
  microDollarsToDollars,
} from "../lib/hub-monetization";

const router: IRouter = Router();

// Ensure authMiddleware has run for any token on this router
router.use(authMiddleware);

/* ========================================================================== */
/* Hub Owner / Manager Endpoints                                              */
/* ========================================================================== */

/**
 * GET /api/pages/:id/monetization
 * Returns status, active rates, balance summary, byFormat totals, item list, and withdrawals.
 */
router.get("/pages/:id/monetization", requireAuth, async (req, res): Promise<void> => {
  const pageId = parseInt(String(req.params.id), 10);
  if (isNaN(pageId)) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }

  const authorized = await canManagePage(req.userId!, pageId);
  if (!authorized) {
    res.status(403).json({ error: "Access denied to hub monetization studio" });
    return;
  }

  const studioData = await getHubMonetizationStudioData(pageId);
  if (!studioData) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  res.json(studioData);
});

/**
 * POST /api/pages/:id/monetization/apply
 * Direct one-click application for Hub monetization.
 */
router.post("/pages/:id/monetization/apply", requireAuth, async (req, res): Promise<void> => {
  const pageId = parseInt(String(req.params.id), 10);
  if (isNaN(pageId)) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }

  const authorized = await canManagePage(req.userId!, pageId);
  if (!authorized) {
    res.status(403).json({ error: "Access denied to manage this hub" });
    return;
  }

  await ensureHubMonetizationSchema();

  const [page] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId));

  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  await db
    .update(pagesTable)
    .set({
      monetizationStatus: "pending",
      monetizationAppliedAt: new Date(),
      monetizationNote: null,
    })
    .where(eq(pagesTable.id, pageId));

  res.json({ success: true, status: "pending" });
});

/**
 * POST /api/pages/:id/monetization/withdraw
 * Validates balance and minimum threshold, deducts ledger, creates payout request.
 */
router.post("/pages/:id/monetization/withdraw", requireAuth, async (req, res): Promise<void> => {
  const pageId = parseInt(String(req.params.id), 10);
  if (isNaN(pageId)) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }

  const authorized = await canManagePage(req.userId!, pageId);
  if (!authorized) {
    res.status(403).json({ error: "Access denied to manage this hub" });
    return;
  }

  await ensureHubMonetizationSchema();

  const amountDollars = Math.floor(Number(req.body.amountDollars));
  const method = String(req.body.method ?? "").toLowerCase() as HubWithdrawalMethod;
  const accountDetails = (req.body.accountDetails ?? {}) as Record<string, unknown>;

  const validMethods: HubWithdrawalMethod[] = [
    "bkash",
    "nagad",
    "binance",
    "paypal",
    "wise",
    "bybit",
  ];

  if (!validMethods.includes(method)) {
    res.status(400).json({
      error: `Invalid payout method. Supported methods: ${validMethods.join(", ")}`,
    });
    return;
  }

  const config = await getHubMonetizationConfig();
  if (amountDollars < config.minWithdrawDollars) {
    res.status(400).json({
      error: `Minimum withdrawal amount is $${config.minWithdrawDollars}`,
    });
    return;
  }

  // Calculate current net micro-dollars balance
  const [balanceRow] = await db
    .select({
      netMicroDollars: sql<number>`COALESCE(SUM(${hubEarningsLedgerTable.microDollars}), 0)::bigint`,
    })
    .from(hubEarningsLedgerTable)
    .where(eq(hubEarningsLedgerTable.pageId, pageId));

  const availableMicroDollars = Number(balanceRow?.netMicroDollars ?? 0);
  const requestedMicroDollars = amountDollars * 1_000_000;

  if (availableMicroDollars < requestedMicroDollars) {
    res.status(400).json({
      error: `Insufficient balance. Available: $${(
        availableMicroDollars / 1_000_000
      ).toFixed(2)}`,
    });
    return;
  }

  // Create withdrawal request
  const [withdrawal] = await db
    .insert(hubWithdrawalRequestsTable)
    .values({
      pageId,
      ownerId: req.userId!,
      amountDollars,
      microDollars: requestedMicroDollars,
      method,
      accountDetails,
      status: "pending",
    })
    .returning();

  // Debit the ledger immediately
  await db.insert(hubEarningsLedgerTable).values({
    pageId,
    contentType: "payout",
    contentId: 0,
    actorId: req.userId!,
    action: "withdraw",
    microDollars: -requestedMicroDollars,
    entityId: withdrawal.id,
    note: `Payout withdrawal #${withdrawal.id} via ${method}`,
  });

  res.status(201).json({
    success: true,
    withdrawal: {
      id: withdrawal.id,
      amountDollars: withdrawal.amountDollars,
      method: withdrawal.method,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt.toISOString(),
    },
  });
});

/**
 * POST /api/pages/:id/monetization/track-view
 * Records a qualified unique view on a post, video, reel, or live stream.
 */
router.post("/pages/:id/monetization/track-view", requireAuth, async (req, res): Promise<void> => {
  const pageId = parseInt(String(req.params.id), 10);
  if (isNaN(pageId)) {
    res.status(400).json({ error: "Invalid page id" });
    return;
  }

  const contentType = req.body.contentType as "post" | "video" | "reel" | "live";
  const contentId = parseInt(String(req.body.contentId), 10);

  if (!contentType || isNaN(contentId)) {
    res.status(400).json({ error: "Invalid contentType or contentId" });
    return;
  }

  const award = await awardHubContentEvent({
    pageId,
    contentType,
    contentId,
    actorId: req.userId,
    action: "view",
    entityId: 0,
  });

  res.json({
    success: award.success,
    awardedMicroDollars: award.awardedMicroDollars,
    reason: award.reason,
  });
});

/* ========================================================================== */
/* Admin Endpoints (protected by requireAdmin)                                */
/* ========================================================================== */

/**
 * GET /api/admin/hub-monetization/summary
 * Platform-wide Hub Monetization KPIs.
 */
router.get(
  "/admin/hub-monetization/summary",
  requireAdmin,
  async (_req, res): Promise<void> => {
    await ensureHubMonetizationSchema();

    const [monetizedHubs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pagesTable)
      .where(eq(pagesTable.monetizationStatus, "approved"));

    const [pendingApps] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pagesTable)
      .where(eq(pagesTable.monetizationStatus, "pending"));

    const [totalEarnings] = await db
      .select({
        totalMicro: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
      })
      .from(hubEarningsLedgerTable);

    const [pendingPayouts] = await db
      .select({
        totalDollars: sql<number>`COALESCE(SUM(${hubWithdrawalRequestsTable.amountDollars}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(hubWithdrawalRequestsTable)
      .where(eq(hubWithdrawalRequestsTable.status, "pending"));

    const [totalPaid] = await db
      .select({
        totalDollars: sql<number>`COALESCE(SUM(${hubWithdrawalRequestsTable.amountDollars}), 0)::int`,
      })
      .from(hubWithdrawalRequestsTable)
      .where(eq(hubWithdrawalRequestsTable.status, "paid"));

    res.json({
      monetizedHubsCount: monetizedHubs?.count ?? 0,
      pendingApplicationsCount: pendingApps?.count ?? 0,
      totalEarningsDollars: microDollarsToDollars(
        Number(totalEarnings?.totalMicro ?? 0),
      ),
      pendingPayoutDollars: pendingPayouts?.totalDollars ?? 0,
      pendingPayoutCount: pendingPayouts?.count ?? 0,
      totalPaidDollars: totalPaid?.totalDollars ?? 0,
    });
  },
);

/**
 * GET /api/admin/hub-monetization/config
 * Read active monetization rates and thresholds.
 */
router.get(
  "/admin/hub-monetization/config",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const config = await getHubMonetizationConfig();
    res.json(config);
  },
);

/**
 * PUT /api/admin/hub-monetization/config
 * Update rates, bonuses, minimum withdrawal, and daily cap.
 */
router.put(
  "/admin/hub-monetization/config",
  requireAdmin,
  async (req, res): Promise<void> => {
    const updates = req.body;
    const updated = await updateHubMonetizationConfig(updates);
    res.json(updated);
  },
);

/**
 * GET /api/admin/hub-monetization/applications
 * List Hub Monetization applications and active Hubs.
 */
router.get(
  "/admin/hub-monetization/applications",
  requireAdmin,
  async (req, res): Promise<void> => {
    await ensureHubMonetizationSchema();

    const statusFilter = req.query.status as string | undefined;

    const pages = await db
      .select({
        id: pagesTable.id,
        name: pagesTable.name,
        category: pagesTable.category,
        description: pagesTable.description,
        avatarUrl: pagesTable.avatarUrl,
        coverUrl: pagesTable.coverUrl,
        createdBy: pagesTable.createdBy,
        monetizationStatus: pagesTable.monetizationStatus,
        monetizationAppliedAt: pagesTable.monetizationAppliedAt,
        monetizationApprovedAt: pagesTable.monetizationApprovedAt,
        monetizationNote: pagesTable.monetizationNote,
      })
      .from(pagesTable)
      .where(
        statusFilter && statusFilter !== "all"
          ? eq(
              pagesTable.monetizationStatus,
              statusFilter as
                | "none"
                | "pending"
                | "approved"
                | "rejected"
                | "suspended",
            )
          : undefined,
      )
      .orderBy(desc(pagesTable.createdAt));

    const creatorIds = [...new Set(pages.map((p) => p.createdBy))];
    const creators =
      creatorIds.length > 0
        ? await db
            .select({
              id: profilesTable.id,
              displayName: profilesTable.displayName,
              username: profilesTable.username,
              avatarUrl: profilesTable.avatarUrl,
            })
            .from(profilesTable)
            .where(inArray(profilesTable.id, creatorIds))
        : [];

    const creatorById = new Map(creators.map((c) => [c.id, c]));

    // Aggregates for each page
    const pageIds = pages.map((p) => p.id);

    const followersCounts =
      pageIds.length > 0
        ? await db
            .select({
              pageId: pageFollowersTable.pageId,
              count: sql<number>`count(*)::int`,
            })
            .from(pageFollowersTable)
            .where(inArray(pageFollowersTable.pageId, pageIds))
            .groupBy(pageFollowersTable.pageId)
        : [];
    const followersMap = new Map(followersCounts.map((f) => [f.pageId, f.count]));

    const postsCounts =
      pageIds.length > 0
        ? await db
            .select({
              pageId: postsTable.pageId,
              count: sql<number>`count(*)::int`,
            })
            .from(postsTable)
            .where(inArray(postsTable.pageId, pageIds))
            .groupBy(postsTable.pageId)
        : [];
    const postsMap = new Map(
      postsCounts.filter((p) => p.pageId != null).map((p) => [p.pageId!, p.count]),
    );

    const reelsCounts =
      pageIds.length > 0
        ? await db
            .select({
              pageId: reelsTable.pageId,
              count: sql<number>`count(*)::int`,
            })
            .from(reelsTable)
            .where(
              and(
                inArray(reelsTable.pageId, pageIds),
                isNull(reelsTable.deletedAt),
              ),
            )
            .groupBy(reelsTable.pageId)
        : [];
    const reelsMap = new Map(
      reelsCounts.filter((r) => r.pageId != null).map((r) => [r.pageId!, r.count]),
    );

    const livesCounts =
      pageIds.length > 0
        ? await db
            .select({
              pageId: liveStreamsTable.pageId,
              count: sql<number>`count(*)::int`,
            })
            .from(liveStreamsTable)
            .where(inArray(liveStreamsTable.pageId, pageIds))
            .groupBy(liveStreamsTable.pageId)
        : [];
    const livesMap = new Map(
      livesCounts.filter((l) => l.pageId != null).map((l) => [l.pageId!, l.count]),
    );

    const ledgerTotals =
      pageIds.length > 0
        ? await db
            .select({
              pageId: hubEarningsLedgerTable.pageId,
              netMicro: sql<number>`COALESCE(SUM(${hubEarningsLedgerTable.microDollars}), 0)::bigint`,
            })
            .from(hubEarningsLedgerTable)
            .where(inArray(hubEarningsLedgerTable.pageId, pageIds))
            .groupBy(hubEarningsLedgerTable.pageId)
        : [];
    const ledgerMap = new Map(
      ledgerTotals.map((l) => [l.pageId, Number(l.netMicro)]),
    );

    const result = pages.map((p) => {
      const owner = creatorById.get(p.createdBy) ?? null;
      const followersCount = followersMap.get(p.id) ?? 0;
      const totalContentCount =
        (postsMap.get(p.id) ?? 0) +
        (reelsMap.get(p.id) ?? 0) +
        (livesMap.get(p.id) ?? 0);
      const earnedBalanceMicro = ledgerMap.get(p.id) ?? 0;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        avatarUrl: p.avatarUrl,
        coverUrl: p.coverUrl,
        owner,
        followersCount,
        totalContentCount,
        monetizationStatus: p.monetizationStatus,
        monetizationAppliedAt: p.monetizationAppliedAt?.toISOString() ?? null,
        monetizationApprovedAt: p.monetizationApprovedAt?.toISOString() ?? null,
        monetizationNote: p.monetizationNote,
        earnedBalanceDollars: Math.max(
          0,
          microDollarsToDollars(earnedBalanceMicro),
        ),
      };
    });

    res.json(result);
  },
);

/**
 * POST /api/admin/hub-monetization/pages/:id/status
 * Update Hub application status (approved | rejected | suspended | pending).
 */
router.post(
  "/admin/hub-monetization/pages/:id/status",
  requireAdmin,
  async (req, res): Promise<void> => {
    const pageId = parseInt(String(req.params.id), 10);
    if (isNaN(pageId)) {
      res.status(400).json({ error: "Invalid page id" });
      return;
    }

    const { status, note } = req.body;
    const validStatuses = ["approved", "rejected", "suspended", "pending", "none"];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    await ensureHubMonetizationSchema();

    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId));

    if (!page) {
      res.status(404).json({ error: "Page not found" });
      return;
    }

    const updates: Partial<typeof pagesTable.$inferInsert> = {
      monetizationStatus: status,
      monetizationNote: note !== undefined ? note : page.monetizationNote,
    };

    if (status === "approved" && !page.monetizationApprovedAt) {
      updates.monetizationApprovedAt = new Date();
    }

    await db.update(pagesTable).set(updates).where(eq(pagesTable.id, pageId));

    res.json({ success: true, status, pageId });
  },
);

/**
 * GET /api/admin/hub-monetization/withdrawals
 * List Hub withdrawal requests.
 */
router.get(
  "/admin/hub-monetization/withdrawals",
  requireAdmin,
  async (req, res): Promise<void> => {
    await ensureHubMonetizationSchema();

    const statusFilter = req.query.status as string | undefined;

    const withdrawals = await db
      .select()
      .from(hubWithdrawalRequestsTable)
      .where(
        statusFilter && statusFilter !== "all"
          ? eq(
              hubWithdrawalRequestsTable.status,
              statusFilter as HubWithdrawalStatus,
            )
          : undefined,
      )
      .orderBy(desc(hubWithdrawalRequestsTable.createdAt));

    const pageIds = [...new Set(withdrawals.map((w) => w.pageId))];
    const pages =
      pageIds.length > 0
        ? await db
            .select({
              id: pagesTable.id,
              name: pagesTable.name,
              avatarUrl: pagesTable.avatarUrl,
              category: pagesTable.category,
            })
            .from(pagesTable)
            .where(inArray(pagesTable.id, pageIds))
        : [];
    const pageById = new Map(pages.map((p) => [p.id, p]));

    const ownerIds = [...new Set(withdrawals.map((w) => w.ownerId))];
    const owners =
      ownerIds.length > 0
        ? await db
            .select({
              id: profilesTable.id,
              displayName: profilesTable.displayName,
              username: profilesTable.username,
              avatarUrl: profilesTable.avatarUrl,
            })
            .from(profilesTable)
            .where(inArray(profilesTable.id, ownerIds))
        : [];
    const ownerById = new Map(owners.map((o) => [o.id, o]));

    const result = withdrawals.map((w) => ({
      id: w.id,
      pageId: w.pageId,
      page: pageById.get(w.pageId) ?? null,
      ownerId: w.ownerId,
      owner: ownerById.get(w.ownerId) ?? null,
      amountDollars: w.amountDollars,
      microDollars: w.microDollars,
      method: w.method,
      accountDetails: w.accountDetails,
      status: w.status,
      adminNote: w.adminNote,
      createdAt: w.createdAt.toISOString(),
      processedAt: w.processedAt?.toISOString() ?? null,
    }));

    res.json(result);
  },
);

/**
 * POST /api/admin/hub-monetization/withdrawals/:id/process
 * Process a withdrawal request (approved | paid | rejected).
 * Automatically refunds ledger on reject!
 */
router.post(
  "/admin/hub-monetization/withdrawals/:id/process",
  requireAdmin,
  async (req, res): Promise<void> => {
    const withdrawalId = parseInt(String(req.params.id), 10);
    if (isNaN(withdrawalId)) {
      res.status(400).json({ error: "Invalid withdrawal id" });
      return;
    }

    const { status, adminNote } = req.body;
    const validStatuses: HubWithdrawalStatus[] = [
      "approved",
      "paid",
      "rejected",
    ];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    await ensureHubMonetizationSchema();

    const [withdrawal] = await db
      .select()
      .from(hubWithdrawalRequestsTable)
      .where(eq(hubWithdrawalRequestsTable.id, withdrawalId));

    if (!withdrawal) {
      res.status(404).json({ error: "Withdrawal request not found" });
      return;
    }

    // If status transitioned to rejected from a non-rejected state, automatically refund the ledger
    if (status === "rejected" && withdrawal.status !== "rejected") {
      await db
        .insert(hubEarningsLedgerTable)
        .values({
          pageId: withdrawal.pageId,
          contentType: "payout",
          contentId: 0,
          actorId: withdrawal.ownerId,
          action: "withdraw_refund",
          microDollars: withdrawal.microDollars, // positive refund
          entityId: withdrawal.id,
          note: `Withdrawal #${withdrawal.id} rejected refund: ${
            adminNote ?? "Rejected by admin"
          }`,
        })
        .onConflictDoNothing({
          target: [
            hubEarningsLedgerTable.pageId,
            hubEarningsLedgerTable.contentType,
            hubEarningsLedgerTable.contentId,
            hubEarningsLedgerTable.actorId,
            hubEarningsLedgerTable.action,
            hubEarningsLedgerTable.entityId,
          ],
        });
    }

    await db
      .update(hubWithdrawalRequestsTable)
      .set({
        status,
        adminNote: adminNote !== undefined ? adminNote : withdrawal.adminNote,
        processedAt: new Date(),
      })
      .where(eq(hubWithdrawalRequestsTable.id, withdrawalId));

    res.json({ success: true, status, withdrawalId });
  },
);

export default router;
