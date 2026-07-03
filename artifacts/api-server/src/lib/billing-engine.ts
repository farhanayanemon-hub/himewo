import {
  db,
  adAccountsTable,
  adCampaignsTable,
  adSetsTable,
  adsTable,
  adImpressionsTable,
  adClicksTable,
  adWalletTransactionsTable,
  adSpendDailyTable,
} from "@workspace/db";
import { and, eq, gt, sql } from "drizzle-orm";

// 1 whole cent = 1000 microcents. Impressions accrue sub-cent cost until a
// whole cent can be flushed to the wallet ledger, so low CPMs stay exact.
const MICROCENTS_PER_CENT = 1000;

export type BillableEvent = "impression" | "click";

export type ChargeResult = {
  /** Whole cents actually deducted from the wallet for this event. */
  chargedCents: number;
  /** True when the account has no spendable funds left after this event. */
  outOfFunds: boolean;
  /** True when auto-recharge (billing threshold) should be attempted. */
  shouldAutoRecharge: boolean;
  /** Terminal limits hit (status flipped to paused; needs manual resume). */
  paused: { adSet: boolean; campaign: boolean; account: boolean };
};

/** Calendar day (YYYY-MM-DD) in the given IANA timezone. */
export function dayInTimezone(tz: string, at: Date): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  }
}

const INF = Number.POSITIVE_INFINITY;

/**
 * Atomically record an ad impression/click and charge the account wallet.
 *
 * Money-integrity guarantees:
 *  - Runs in a single transaction that locks the account, ad set and campaign
 *    rows FOR UPDATE, so concurrent events on the same entities serialize.
 *  - Charges only the billing event configured on the ad set (a CPC ad set does
 *    not pay for impressions, and vice-versa).
 *  - Draws from promotional credit BEFORE real balance.
 *  - Never lets any cached balance go negative (also enforced by DB CHECKs); the
 *    charge is capped by available funds AND by every remaining budget / spend
 *    limit, so a cap is never overshot.
 *  - Flips status to "paused" for TERMINAL limits (lifetime budget / spend
 *    limit). Daily-budget and out-of-funds stops are left to the serving gate so
 *    they auto-recover (next day / after a top-up) without manual resume.
 */
export async function chargeAdEvent(opts: {
  ad: typeof adsTable.$inferSelect;
  event: BillableEvent;
  viewerId: string;
  placement: string | null;
  /**
   * If a matching tracking row for this viewer+ad already exists within this
   * many ms, treat the event as a duplicate and do NOT re-charge. This check
   * runs INSIDE the transaction after the account row is locked FOR UPDATE, so
   * concurrent duplicate events serialize and only the first one is charged
   * (replay-proof against the request-level race).
   */
  dedupeMs?: number;
}): Promise<ChargeResult> {
  const { ad, event, viewerId, placement, dedupeMs = 0 } = opts;
  const now = new Date();

  return db.transaction(async (tx): Promise<ChargeResult> => {
    const [account] = await tx
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, ad.accountId))
      .for("update");
    const [adSet] = await tx
      .select()
      .from(adSetsTable)
      .where(eq(adSetsTable.id, ad.adSetId))
      .for("update");
    const [campaign] = adSet
      ? await tx
          .select()
          .from(adCampaignsTable)
          .where(eq(adCampaignsTable.id, adSet.campaignId))
          .for("update")
      : [undefined];

    const insertTracking = async (costCents: number): Promise<number> => {
      if (event === "impression") {
        const [row] = await tx
          .insert(adImpressionsTable)
          .values({ adId: ad.id, accountId: ad.accountId, viewerId, placement, costCents })
          .returning({ id: adImpressionsTable.id });
        return row.id;
      }
      const [row] = await tx
        .insert(adClicksTable)
        .values({ adId: ad.id, accountId: ad.accountId, viewerId, placement, costCents })
        .returning({ id: adClicksTable.id });
      return row.id;
    };

    const noCharge: ChargeResult = {
      chargedCents: 0,
      outOfFunds: false,
      shouldAutoRecharge: false,
      paused: { adSet: false, campaign: false, account: false },
    };

    // Authoritative duplicate guard: now that the account row is locked, a
    // concurrent request for the same viewer+ad will have committed its tracking
    // row before we get here, so we can safely no-op without double-charging.
    if (dedupeMs > 0) {
      const cutoff = new Date(now.getTime() - dedupeMs);
      const dup =
        event === "impression"
          ? await tx
              .select({ id: adImpressionsTable.id })
              .from(adImpressionsTable)
              .where(
                and(
                  eq(adImpressionsTable.adId, ad.id),
                  eq(adImpressionsTable.viewerId, viewerId),
                  gt(adImpressionsTable.createdAt, cutoff),
                ),
              )
          : await tx
              .select({ id: adClicksTable.id })
              .from(adClicksTable)
              .where(
                and(
                  eq(adClicksTable.adId, ad.id),
                  eq(adClicksTable.viewerId, viewerId),
                  gt(adClicksTable.createdAt, cutoff),
                ),
              );
      if (dup.length > 0) return noCharge;
    }

    if (!account || !adSet || !campaign) {
      await insertTracking(0);
      return noCharge;
    }

    // Only the configured billing event is charged.
    const billsThisEvent =
      (adSet.billingEvent === "impressions" && event === "impression") ||
      (adSet.billingEvent === "clicks" && event === "click");
    if (!billsThisEvent) {
      await insertTracking(0);
      return noCharge;
    }

    // Per-event microcents: clicks bill the full CPC; impressions bill CPM/1000
    // (i.e. `bidCents` microcents each).
    const perEventMicro =
      adSet.billingEvent === "clicks"
        ? adSet.bidCents * MICROCENTS_PER_CENT
        : adSet.bidCents;

    const totalMicro = adSet.accruedMicrocents + perEventMicro;
    const wholeCents = Math.floor(totalMicro / MICROCENTS_PER_CENT);

    const available = account.creditBalanceCents + account.balanceCents;
    const day = dayInTimezone(account.timezone, now);

    // Today's spend for this ad set and (across all its ad sets) this campaign.
    const [adSetToday] = await tx
      .select({ spentCents: adSpendDailyTable.spentCents })
      .from(adSpendDailyTable)
      .where(
        and(
          eq(adSpendDailyTable.adSetId, adSet.id),
          eq(adSpendDailyTable.day, day),
        ),
      );
    const [campaignTodayRow] = await tx
      .select({
        spentCents: sql<number>`coalesce(sum(${adSpendDailyTable.spentCents}), 0)`,
      })
      .from(adSpendDailyTable)
      .where(
        and(
          eq(adSpendDailyTable.campaignId, campaign.id),
          eq(adSpendDailyTable.day, day),
        ),
      );
    const adSetTodaySpent = adSetToday?.spentCents ?? 0;
    const campaignTodaySpent = Number(campaignTodayRow?.spentCents ?? 0);

    const remaining = Math.max(
      0,
      Math.min(
        available,
        account.spendLimitCents != null
          ? account.spendLimitCents - account.spentCents
          : INF,
        adSet.lifetimeBudgetCents != null
          ? adSet.lifetimeBudgetCents - adSet.spentCents
          : INF,
        campaign.lifetimeBudgetCents != null
          ? campaign.lifetimeBudgetCents - campaign.spentCents
          : INF,
        adSet.dailyBudgetCents != null
          ? adSet.dailyBudgetCents - adSetTodaySpent
          : INF,
        campaign.dailyBudgetCents != null
          ? campaign.dailyBudgetCents - campaignTodaySpent
          : INF,
      ),
    );

    const chargeCents = Math.min(wholeCents, remaining);
    const remainderMicro = totalMicro - chargeCents * MICROCENTS_PER_CENT;

    const creditUse = Math.min(chargeCents, account.creditBalanceCents);
    const realUse = chargeCents - creditUse;
    const newCredit = account.creditBalanceCents - creditUse;
    const newBalance = account.balanceCents - realUse;
    const newAccountSpent = account.spentCents + chargeCents;
    const newAdSetSpent = adSet.spentCents + chargeCents;
    const newCampaignSpent = campaign.spentCents + chargeCents;

    const trackingId = await insertTracking(chargeCents);

    if (chargeCents > 0) {
      await tx.insert(adWalletTransactionsTable).values({
        accountId: account.id,
        type: "charge",
        amountCents: -chargeCents,
        currency: account.currency,
        balanceAfterCents: newCredit + newBalance,
        description: `Ad ${event} — ${ad.name} (#${ad.id})`,
        // Ledger row keyed to the tracking event for audit/reconciliation; the
        // partial-unique index on reference_id also backstops any true replay.
        referenceId: `charge:${event}:${trackingId}`,
      });
      await tx
        .update(adAccountsTable)
        .set({
          creditBalanceCents: newCredit,
          balanceCents: newBalance,
          spentCents: newAccountSpent,
        })
        .where(eq(adAccountsTable.id, account.id));
      await tx
        .update(adCampaignsTable)
        .set({ spentCents: newCampaignSpent })
        .where(eq(adCampaignsTable.id, campaign.id));
      await tx
        .insert(adSpendDailyTable)
        .values({
          accountId: account.id,
          campaignId: campaign.id,
          adSetId: adSet.id,
          day,
          spentCents: chargeCents,
        })
        .onConflictDoUpdate({
          target: [adSpendDailyTable.adSetId, adSpendDailyTable.day],
          set: {
            spentCents: sql`${adSpendDailyTable.spentCents} + ${chargeCents}`,
          },
        });
    }

    // Always persist the accrual remainder so sub-cent spend is never lost.
    await tx
      .update(adSetsTable)
      .set({ accruedMicrocents: remainderMicro, spentCents: newAdSetSpent })
      .where(eq(adSetsTable.id, adSet.id));

    // Terminal limits → flip status to paused (needs manual resume).
    const accountLimitHit =
      account.spendLimitCents != null &&
      newAccountSpent >= account.spendLimitCents;
    const campaignLimitHit =
      campaign.lifetimeBudgetCents != null &&
      newCampaignSpent >= campaign.lifetimeBudgetCents;
    const adSetLimitHit =
      adSet.lifetimeBudgetCents != null &&
      newAdSetSpent >= adSet.lifetimeBudgetCents;

    if (accountLimitHit) {
      await tx
        .update(adsTable)
        .set({ status: "paused" })
        .where(
          and(eq(adsTable.accountId, account.id), eq(adsTable.status, "active")),
        );
    }
    if (campaignLimitHit) {
      await tx
        .update(adCampaignsTable)
        .set({ status: "paused" })
        .where(eq(adCampaignsTable.id, campaign.id));
    }
    if (adSetLimitHit) {
      await tx
        .update(adSetsTable)
        .set({ status: "paused" })
        .where(eq(adSetsTable.id, adSet.id));
    }

    const availableAfter = newCredit + newBalance;
    const outOfFunds = availableAfter <= 0;
    const shouldAutoRecharge =
      account.autoRechargeEnabled &&
      !!account.defaultPaymentMethodId &&
      !!account.stripeCustomerId &&
      account.autoRechargeThresholdCents != null &&
      account.autoRechargeAmountCents != null &&
      availableAfter < account.autoRechargeThresholdCents;

    return {
      chargedCents: chargeCents,
      outOfFunds,
      shouldAutoRecharge,
      paused: {
        adSet: adSetLimitHit,
        campaign: campaignLimitHit,
        account: accountLimitHit,
      },
    };
  });
}

/**
 * Credit money into an account wallet atomically and append a ledger row.
 * Used by top-ups (real balance) and coupon redemption (promotional credit).
 * Idempotent on `referenceId` via the partial-unique index — a duplicate
 * external event is a no-op that returns the existing balance.
 */
export async function creditWallet(opts: {
  accountId: number;
  amountCents: number;
  type: "topup" | "credit" | "refund" | "adjustment";
  /** Credit goes to the promotional credit pool instead of real balance. */
  toCredit?: boolean;
  description?: string | null;
  referenceId?: string | null;
  couponId?: number | null;
  createdBy?: string | null;
}): Promise<{ applied: boolean; balanceCents: number; creditBalanceCents: number }> {
  const {
    accountId,
    amountCents,
    type,
    toCredit = false,
    description = null,
    referenceId = null,
    couponId = null,
    createdBy = null,
  } = opts;
  if (amountCents <= 0) throw new Error("credit amount must be positive");

  return db.transaction(async (tx) => {
    if (referenceId) {
      const [existing] = await tx
        .select({ id: adWalletTransactionsTable.id })
        .from(adWalletTransactionsTable)
        .where(eq(adWalletTransactionsTable.referenceId, referenceId));
      if (existing) {
        const [acct] = await tx
          .select({
            balanceCents: adAccountsTable.balanceCents,
            creditBalanceCents: adAccountsTable.creditBalanceCents,
          })
          .from(adAccountsTable)
          .where(eq(adAccountsTable.id, accountId));
        return {
          applied: false,
          balanceCents: acct?.balanceCents ?? 0,
          creditBalanceCents: acct?.creditBalanceCents ?? 0,
        };
      }
    }

    const [account] = await tx
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, accountId))
      .for("update");
    if (!account) throw new Error("account not found");

    const newBalance = toCredit
      ? account.balanceCents
      : account.balanceCents + amountCents;
    const newCredit = toCredit
      ? account.creditBalanceCents + amountCents
      : account.creditBalanceCents;

    await tx.insert(adWalletTransactionsTable).values({
      accountId,
      type,
      amountCents,
      currency: account.currency,
      balanceAfterCents: newBalance + newCredit,
      description,
      referenceId,
      couponId,
      createdBy,
    });
    await tx
      .update(adAccountsTable)
      .set({ balanceCents: newBalance, creditBalanceCents: newCredit })
      .where(eq(adAccountsTable.id, accountId));

    return {
      applied: true,
      balanceCents: newBalance,
      creditBalanceCents: newCredit,
    };
  });
}
