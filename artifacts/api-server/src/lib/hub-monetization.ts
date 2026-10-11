import {
  db,
  hubMonetizationConfigTable,
  hubEarningsLedgerTable,
  hubWithdrawalRequestsTable,
  pagesTable,
  pageMembersTable,
  pageFollowersTable,
  profilesTable,
  postsTable,
  postMediaTable,
  postReactionsTable,
  commentsTable,
  sharesTable,
  reelsTable,
  reelLikesTable,
  reelCommentsTable,
  liveStreamsTable,
  type HubMonetizationConfig,
  type HubContentType,
  type HubMonetizationAction,
  type HubWithdrawalMethod,
  type HubWithdrawalStatus,
} from "@workspace/db";
import { sql, eq, and, or, gte, desc, inArray, isNull, count } from "drizzle-orm";
import { logger } from "./logger";
import { canManagePage } from "./authz";

let schemaChecked = false;

/**
 * Safe additive runtime DDL execution.
 * Ensures tables, columns, indexes, and seed row id = 1 exist even before migrations run.
 */
export async function ensureHubMonetizationSchema(): Promise<void> {
  if (schemaChecked) return;
  try {
    // 1. Extend pagesTable columns
    await db.execute(
      sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS monetization_status text NOT NULL DEFAULT 'none';`,
    );
    await db.execute(
      sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS monetization_applied_at timestamp with time zone;`,
    );
    await db.execute(
      sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS monetization_approved_at timestamp with time zone;`,
    );
    await db.execute(
      sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS monetization_note text;`,
    );

    // 2. Extend reelsTable & liveStreamsTable
    await db.execute(
      sql`ALTER TABLE reels ADD COLUMN IF NOT EXISTS page_id integer;`,
    );
    await db.execute(
      sql`ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS page_id integer;`,
    );

    // 3. Create hub_monetization_config
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hub_monetization_config (
        id integer PRIMARY KEY DEFAULT 1,
        enabled boolean NOT NULL DEFAULT true,
        post_rpm_cents integer NOT NULL DEFAULT 100,
        reel_rpm_cents integer NOT NULL DEFAULT 200,
        video_rpm_cents integer NOT NULL DEFAULT 300,
        live_rpm_cents integer NOT NULL DEFAULT 400,
        like_micro_dollars integer NOT NULL DEFAULT 1000,
        comment_micro_dollars integer NOT NULL DEFAULT 2000,
        share_micro_dollars integer NOT NULL DEFAULT 5000,
        min_withdraw_dollars integer NOT NULL DEFAULT 20,
        daily_hub_cap_micro_dollars integer NOT NULL DEFAULT 50000000,
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    // Seed config row id = 1
    await db.execute(sql`
      INSERT INTO hub_monetization_config (
        id, enabled, post_rpm_cents, reel_rpm_cents, video_rpm_cents, live_rpm_cents,
        like_micro_dollars, comment_micro_dollars, share_micro_dollars, min_withdraw_dollars,
        daily_hub_cap_micro_dollars
      ) VALUES (1, true, 100, 200, 300, 400, 1000, 2000, 5000, 20, 50000000)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Create hub_earnings_ledger
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hub_earnings_ledger (
        id serial PRIMARY KEY,
        page_id integer NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        content_type text NOT NULL,
        content_id integer NOT NULL DEFAULT 0,
        actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
        action text NOT NULL,
        micro_dollars integer NOT NULL,
        entity_id integer NOT NULL DEFAULT 0,
        note text,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS hub_earnings_page_created_idx ON hub_earnings_ledger(page_id, created_at);`,
    );
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS hub_earnings_idem_idx ON hub_earnings_ledger(page_id, content_type, content_id, actor_id, action, entity_id);`,
    );

    // 5. Create hub_withdrawal_requests
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hub_withdrawal_requests (
        id serial PRIMARY KEY,
        page_id integer NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        amount_dollars integer NOT NULL,
        micro_dollars integer NOT NULL,
        method text NOT NULL,
        account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'pending',
        admin_note text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        processed_at timestamp with time zone
      );
    `);

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS hub_withdrawals_page_created_idx ON hub_withdrawal_requests(page_id, created_at);`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS hub_withdrawals_status_idx ON hub_withdrawal_requests(status);`,
    );

    schemaChecked = true;
    logger.info("Hub monetization safe additive DDL initialized successfully");
  } catch (err) {
    logger.error({ err }, "ensureHubMonetizationSchema failed non-fatally");
  }
}

/**
 * Fetch or seed default hub monetization configuration.
 */
export async function getHubMonetizationConfig(): Promise<HubMonetizationConfig> {
  if (!schemaChecked) await ensureHubMonetizationSchema();
  const [existing] = await db
    .select()
    .from(hubMonetizationConfigTable)
    .where(eq(hubMonetizationConfigTable.id, 1));
  if (existing) return existing;

  await db
    .insert(hubMonetizationConfigTable)
    .values({ id: 1 })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(hubMonetizationConfigTable)
    .where(eq(hubMonetizationConfigTable.id, 1));
  return (
    row ?? {
      id: 1,
      enabled: true,
      postRpmCents: 100,
      reelRpmCents: 200,
      videoRpmCents: 300,
      liveRpmCents: 400,
      likeMicroDollars: 1000,
      commentMicroDollars: 2000,
      shareMicroDollars: 5000,
      minWithdrawDollars: 20,
      dailyHubCapMicroDollars: 50000000,
      updatedAt: new Date(),
    }
  );
}

/**
 * Update hub monetization configuration (Admin action).
 */
export async function updateHubMonetizationConfig(
  updates: Partial<HubMonetizationConfig>,
): Promise<HubMonetizationConfig> {
  if (!schemaChecked) await ensureHubMonetizationSchema();
  await db
    .update(hubMonetizationConfigTable)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(hubMonetizationConfigTable.id, 1));

  return getHubMonetizationConfig();
}

export interface AwardHubContentEventParams {
  pageId: number;
  contentType: "post" | "video" | "reel" | "live";
  contentId: number;
  actorId?: string | null;
  action: "view" | "like" | "comment" | "share";
  entityId?: number;
  note?: string;
}

export interface AwardResult {
  success: boolean;
  awardedMicroDollars: number;
  reason?: string;
}

/**
 * Core monetization calculation engine:
 * 1. Verifies page monetizationStatus === "approved"
 * 2. Verifies hub_monetization_config.enabled === true
 * 3. Prevents self-earning: checks canManagePage(actorId, pageId)
 * 4. Distinguishes format RPM (post, video, reel, live) & engagement bonuses
 * 5. Enforces dailyHubCapMicroDollars
 * 6. Idempotently inserts ledger row
 */
export async function awardHubContentEvent(
  params: AwardHubContentEventParams,
): Promise<AwardResult> {
  if (!schemaChecked) await ensureHubMonetizationSchema();

  const {
    pageId,
    contentType,
    contentId,
    actorId,
    action,
    entityId = 0,
    note,
  } = params;

  // 1. Verify global config enabled
  const config = await getHubMonetizationConfig();
  if (!config.enabled) {
    return {
      success: false,
      awardedMicroDollars: 0,
      reason: "monetization_disabled",
    };
  }

  // 2. Verify page approved
  const [page] = await db
    .select({
      id: pagesTable.id,
      monetizationStatus: pagesTable.monetizationStatus,
    })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId));

  if (!page || page.monetizationStatus !== "approved") {
    return {
      success: false,
      awardedMicroDollars: 0,
      reason: "hub_not_approved",
    };
  }

  // 3. Prevent self-earning
  if (actorId) {
    const isManager = await canManagePage(actorId, pageId);
    if (isManager) {
      return {
        success: false,
        awardedMicroDollars: 0,
        reason: "self_earning_prevented",
      };
    }
  }

  // 4. Calculate micro-dollars to award
  let grantMicroDollars = 0;
  if (action === "view") {
    let rpmCents = config.postRpmCents;
    if (contentType === "reel") rpmCents = config.reelRpmCents;
    else if (contentType === "video") rpmCents = config.videoRpmCents;
    else if (contentType === "live") rpmCents = config.liveRpmCents;

    grantMicroDollars = Math.round((rpmCents * 10000) / 1000);
  } else if (action === "like") {
    grantMicroDollars = config.likeMicroDollars;
  } else if (action === "comment") {
    grantMicroDollars = config.commentMicroDollars;
  } else if (action === "share") {
    grantMicroDollars = config.shareMicroDollars;
  }

  if (grantMicroDollars <= 0) {
    return { success: false, awardedMicroDollars: 0, reason: "zero_reward" };
  }

  // 5. Enforce daily hub cap
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const [todaySummary] = await db
    .select({
      earnedToday: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
    })
    .from(hubEarningsLedgerTable)
    .where(
      and(
        eq(hubEarningsLedgerTable.pageId, pageId),
        gte(hubEarningsLedgerTable.createdAt, startOfToday),
      ),
    );

  const earnedToday = Number(todaySummary?.earnedToday ?? 0);
  const remainingCap = Math.max(0, config.dailyHubCapMicroDollars - earnedToday);

  if (remainingCap <= 0) {
    return {
      success: false,
      awardedMicroDollars: 0,
      reason: "daily_cap_reached",
    };
  }

  const actualCredit = Math.min(grantMicroDollars, remainingCap);

  // 6. Idempotently insert into ledger
  const [inserted] = await db
    .insert(hubEarningsLedgerTable)
    .values({
      pageId,
      contentType,
      contentId,
      actorId: actorId ?? null,
      action,
      microDollars: actualCredit,
      entityId,
      note: note ?? `Award for ${action} on ${contentType} #${contentId}`,
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
    })
    .returning();

  if (!inserted) {
    return {
      success: false,
      awardedMicroDollars: 0,
      reason: "already_awarded",
    };
  }

  return { success: true, awardedMicroDollars: actualCredit };
}

export function microDollarsToDollars(microDollars: number): number {
  return Number((microDollars / 1_000_000).toFixed(4));
}

export interface HubContentItem {
  id: number;
  contentType: "post" | "video" | "reel" | "live";
  title: string;
  thumbnailUrl: string | null;
  createdAt: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  earnedDollars: number;
}

export interface HubMonetizationStudioData {
  pageId: number;
  pageName: string;
  status: string;
  appliedAt: string | null;
  approvedAt: string | null;
  monetizationNote: string | null;
  rates: {
    postRpmDollars: number;
    reelRpmDollars: number;
    videoRpmDollars: number;
    liveRpmDollars: number;
    likeBonusDollars: number;
    commentBonusDollars: number;
    shareBonusDollars: number;
    minWithdrawDollars: number;
  };
  balance: {
    balanceDollars: number;
    todayDollars: number;
    last7DaysDollars: number;
    last28DaysDollars: number;
    lifetimeDollars: number;
    pendingWithdrawDollars: number;
    totalWithdrawnDollars: number;
  };
  byFormat: {
    post: { earnedDollars: number; views: number; engagements: number };
    reel: { earnedDollars: number; views: number; engagements: number };
    video: { earnedDollars: number; views: number; engagements: number };
    live: { earnedDollars: number; views: number; engagements: number };
  };
  items: HubContentItem[];
  withdrawals: Array<{
    id: number;
    amountDollars: number;
    method: string;
    accountDetails: Record<string, unknown>;
    status: string;
    adminNote: string | null;
    createdAt: string;
    processedAt: string | null;
  }>;
}

/**
 * Builds the complete Hub Monetization Studio Dashboard payload for Hub Owners and Managers.
 */
export async function getHubMonetizationStudioData(
  pageId: number,
): Promise<HubMonetizationStudioData | null> {
  if (!schemaChecked) await ensureHubMonetizationSchema();

  const [page] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId));

  if (!page) return null;

  const config = await getHubMonetizationConfig();

  // Balance calculations
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const [totals] = await db
    .select({
      netMicroDollars: sql<number>`COALESCE(SUM(${hubEarningsLedgerTable.microDollars}), 0)::bigint`,
      lifetimeMicroDollars: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
      todayMicroDollars: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 AND ${hubEarningsLedgerTable.createdAt} >= ${startOfToday} THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
      last7DaysMicroDollars: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 AND ${hubEarningsLedgerTable.createdAt} >= ${sevenDaysAgo} THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
      last28DaysMicroDollars: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 AND ${hubEarningsLedgerTable.createdAt} >= ${twentyEightDaysAgo} THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
    })
    .from(hubEarningsLedgerTable)
    .where(eq(hubEarningsLedgerTable.pageId, pageId));

  const [pendingWithdrawRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${hubWithdrawalRequestsTable.amountDollars}), 0)::int`,
    })
    .from(hubWithdrawalRequestsTable)
    .where(
      and(
        eq(hubWithdrawalRequestsTable.pageId, pageId),
        eq(hubWithdrawalRequestsTable.status, "pending"),
      ),
    );

  const [paidWithdrawRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${hubWithdrawalRequestsTable.amountDollars}), 0)::int`,
    })
    .from(hubWithdrawalRequestsTable)
    .where(
      and(
        eq(hubWithdrawalRequestsTable.pageId, pageId),
        eq(hubWithdrawalRequestsTable.status, "paid"),
      ),
    );

  const netMicro = Number(totals?.netMicroDollars ?? 0);
  const balanceDollars = Math.max(0, microDollarsToDollars(netMicro));
  const todayDollars = microDollarsToDollars(Number(totals?.todayMicroDollars ?? 0));
  const last7DaysDollars = microDollarsToDollars(Number(totals?.last7DaysMicroDollars ?? 0));
  const last28DaysDollars = microDollarsToDollars(Number(totals?.last28DaysMicroDollars ?? 0));
  const lifetimeDollars = microDollarsToDollars(Number(totals?.lifetimeMicroDollars ?? 0));
  const pendingWithdrawDollars = Number(pendingWithdrawRow?.total ?? 0);
  const totalWithdrawnDollars = Number(paidWithdrawRow?.total ?? 0);

  // byFormat aggregation
  const formatRows = await db
    .select({
      contentType: hubEarningsLedgerTable.contentType,
      action: hubEarningsLedgerTable.action,
      totalMicroDollars: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
      eventCount: sql<number>`count(*)::int`,
    })
    .from(hubEarningsLedgerTable)
    .where(eq(hubEarningsLedgerTable.pageId, pageId))
    .groupBy(
      hubEarningsLedgerTable.contentType,
      hubEarningsLedgerTable.action,
    );

  const byFormat = {
    post: { earnedDollars: 0, views: 0, engagements: 0 },
    reel: { earnedDollars: 0, views: 0, engagements: 0 },
    video: { earnedDollars: 0, views: 0, engagements: 0 },
    live: { earnedDollars: 0, views: 0, engagements: 0 },
  };

  for (const row of formatRows) {
    const ct = row.contentType as "post" | "reel" | "video" | "live";
    if (byFormat[ct]) {
      byFormat[ct].earnedDollars += microDollarsToDollars(
        Number(row.totalMicroDollars),
      );
      if (row.action === "view") {
        byFormat[ct].views += row.eventCount;
      } else if (
        row.action === "like" ||
        row.action === "comment" ||
        row.action === "share"
      ) {
        byFormat[ct].engagements += row.eventCount;
      }
    }
  }

  // Grouped stats per content item from ledger
  const ledgerContentStats = await db
    .select({
      contentType: hubEarningsLedgerTable.contentType,
      contentId: hubEarningsLedgerTable.contentId,
      action: hubEarningsLedgerTable.action,
      earnedMicroDollars: sql<number>`COALESCE(SUM(CASE WHEN ${hubEarningsLedgerTable.microDollars} > 0 THEN ${hubEarningsLedgerTable.microDollars} ELSE 0 END), 0)::bigint`,
      actionCount: sql<number>`count(*)::int`,
    })
    .from(hubEarningsLedgerTable)
    .where(eq(hubEarningsLedgerTable.pageId, pageId))
    .groupBy(
      hubEarningsLedgerTable.contentType,
      hubEarningsLedgerTable.contentId,
      hubEarningsLedgerTable.action,
    );

  const statsMap = new Map<
    string,
    {
      earnedMicro: number;
      views: number;
      likes: number;
      comments: number;
      shares: number;
    }
  >();

  for (const row of ledgerContentStats) {
    const key = `${row.contentType}:${row.contentId}`;
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        earnedMicro: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      });
    }
    const stat = statsMap.get(key)!;
    stat.earnedMicro += Number(row.earnedMicroDollars);
    if (row.action === "view") stat.views += row.actionCount;
    else if (row.action === "like") stat.likes += row.actionCount;
    else if (row.action === "comment") stat.comments += row.actionCount;
    else if (row.action === "share") stat.shares += row.actionCount;
  }

  // Retrieve posts
  const posts = await db
    .select({
      id: postsTable.id,
      content: postsTable.content,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .where(eq(postsTable.pageId, pageId))
    .orderBy(desc(postsTable.createdAt));

  const postIds = posts.map((p) => p.id);
  const mediaRows =
    postIds.length > 0
      ? await db
          .select({
            postId: postMediaTable.postId,
            type: postMediaTable.type,
            url: postMediaTable.url,
          })
          .from(postMediaTable)
          .where(inArray(postMediaTable.postId, postIds))
      : [];

  const mediaByPost = new Map<
    number,
    Array<{ type: string; url: string }>
  >();
  for (const m of mediaRows) {
    if (!mediaByPost.has(m.postId)) mediaByPost.set(m.postId, []);
    mediaByPost.get(m.postId)!.push(m);
  }

  // Retrieve reels (with fallback support for creator's reels)
  const reels = await db
    .select({
      id: reelsTable.id,
      caption: reelsTable.caption,
      thumbnailUrl: reelsTable.thumbnailUrl,
      createdAt: reelsTable.createdAt,
    })
    .from(reelsTable)
    .where(
      and(
        or(
          eq(reelsTable.pageId, pageId),
          and(isNull(reelsTable.pageId), eq(reelsTable.authorId, page.createdBy)),
        ),
        isNull(reelsTable.deletedAt),
      ),
    )
    .orderBy(desc(reelsTable.createdAt));

  // Retrieve live streams (with fallback support for creator's streams)
  const liveStreams = await db
    .select({
      id: liveStreamsTable.id,
      title: liveStreamsTable.title,
      startedAt: liveStreamsTable.startedAt,
    })
    .from(liveStreamsTable)
    .where(
      or(
        eq(liveStreamsTable.pageId, pageId),
        and(
          isNull(liveStreamsTable.pageId),
          eq(liveStreamsTable.hostId, page.createdBy),
        ),
      ),
    )
    .orderBy(desc(liveStreamsTable.startedAt));

  // Build items array
  const items: HubContentItem[] = [];

  for (const p of posts) {
    const medias = mediaByPost.get(p.id) ?? [];
    const hasVideo = medias.some((m) => m.type === "video");
    const formatType = hasVideo ? "video" : "post";
    const statKey = `${formatType}:${p.id}`;
    const altKey = `${hasVideo ? "post" : "video"}:${p.id}`;
    const stat = statsMap.get(statKey) ?? statsMap.get(altKey) ?? {
      earnedMicro: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    items.push({
      id: p.id,
      contentType: formatType,
      title: p.content
        ? p.content.length > 80
          ? `${p.content.slice(0, 77)}...`
          : p.content
        : "Untitled Post",
      thumbnailUrl: medias[0]?.url ?? null,
      createdAt: p.createdAt.toISOString(),
      viewsCount: stat.views,
      likesCount: stat.likes,
      commentsCount: stat.comments,
      sharesCount: stat.shares,
      earnedDollars: microDollarsToDollars(stat.earnedMicro),
    });
  }

  for (const r of reels) {
    const stat = statsMap.get(`reel:${r.id}`) ?? {
      earnedMicro: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    items.push({
      id: r.id,
      contentType: "reel",
      title: r.caption ?? "Untitled Reel",
      thumbnailUrl: r.thumbnailUrl,
      createdAt: r.createdAt.toISOString(),
      viewsCount: stat.views,
      likesCount: stat.likes,
      commentsCount: stat.comments,
      sharesCount: stat.shares,
      earnedDollars: microDollarsToDollars(stat.earnedMicro),
    });
  }

  for (const l of liveStreams) {
    const stat = statsMap.get(`live:${l.id}`) ?? {
      earnedMicro: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    items.push({
      id: l.id,
      contentType: "live",
      title: l.title,
      thumbnailUrl: null,
      createdAt: l.startedAt.toISOString(),
      viewsCount: stat.views,
      likesCount: stat.likes,
      commentsCount: stat.comments,
      sharesCount: stat.shares,
      earnedDollars: microDollarsToDollars(stat.earnedMicro),
    });
  }

  // Sort items by createdAt desc
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Retrieve withdrawals
  const withdrawals = await db
    .select()
    .from(hubWithdrawalRequestsTable)
    .where(eq(hubWithdrawalRequestsTable.pageId, pageId))
    .orderBy(desc(hubWithdrawalRequestsTable.createdAt));

  return {
    pageId: page.id,
    pageName: page.name,
    status: page.monetizationStatus,
    appliedAt: page.monetizationAppliedAt?.toISOString() ?? null,
    approvedAt: page.monetizationApprovedAt?.toISOString() ?? null,
    monetizationNote: page.monetizationNote,
    rates: {
      postRpmDollars: config.postRpmCents / 100,
      reelRpmDollars: config.reelRpmCents / 100,
      videoRpmDollars: config.videoRpmCents / 100,
      liveRpmDollars: config.liveRpmCents / 100,
      likeBonusDollars: config.likeMicroDollars / 1_000_000,
      commentBonusDollars: config.commentMicroDollars / 1_000_000,
      shareBonusDollars: config.shareMicroDollars / 1_000_000,
      minWithdrawDollars: config.minWithdrawDollars,
    },
    balance: {
      balanceDollars,
      todayDollars,
      last7DaysDollars,
      last28DaysDollars,
      lifetimeDollars,
      pendingWithdrawDollars,
      totalWithdrawnDollars,
    },
    byFormat,
    items,
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amountDollars: w.amountDollars,
      method: w.method,
      accountDetails: w.accountDetails,
      status: w.status,
      adminNote: w.adminNote,
      createdAt: w.createdAt.toISOString(),
      processedAt: w.processedAt?.toISOString() ?? null,
    })),
  };
}
