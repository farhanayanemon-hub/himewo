import { Router, type IRouter, type Response } from "express";
import {
  db,
  adAccountsTable,
  adAccountMembersTable,
  adCampaignsTable,
  adSetsTable,
  adTargetingTable,
  adSchedulesTable,
  adsTable,
  adCreativesTable,
  adSavedAudiencesTable,
  adWalletTransactionsTable,
  adCouponsTable,
  adSpendDailyTable,
  adImpressionsTable,
  adClicksTable,
  postsTable,
  pagesTable,
  profilesTable,
  type AdRole,
  type AdTargeting,
} from "@workspace/db";
import { and, eq, desc, gt, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildPosts, buildPage } from "../lib/serialize";
import { chargeAdEvent, dayInTimezone } from "../lib/billing-engine";
import {
  maybeAutoRecharge,
  stripeConfigured,
  createTopupCheckout,
  createSetupCheckout,
  listCards as listStripeCards,
  setDefaultCard as setStripeDefaultCard,
  removeCard as removeStripeCard,
} from "../lib/stripe-billing";
import {
  resolveAdAccountAccess,
  canRead,
  canManageAds,
  canManageAccount,
} from "../lib/ads-auth";
import {
  getInsights,
  capturePixelConversion,
  listConversions,
  signPixelToken,
  verifyPixelToken,
  type InsightsLevel,
} from "../lib/analytics";
import {
  ListAdAccountsResponse,
  CreateAdAccountBody,
  CreateAdAccountResponse,
  GetAdAccountParams,
  GetAdAccountResponse,
  UpdateAdAccountParams,
  UpdateAdAccountBody,
  UpdateAdAccountResponse,
  TransferAdAccountParams,
  TransferAdAccountBody,
  TransferAdAccountResponse,
  ListAdAccountMembersParams,
  ListAdAccountMembersResponse,
  AddAdAccountMemberParams,
  AddAdAccountMemberBody,
  AddAdAccountMemberResponse,
  UpdateAdAccountMemberParams,
  UpdateAdAccountMemberBody,
  UpdateAdAccountMemberResponse,
  RemoveAdAccountMemberParams,
  ListAdCampaignsParams,
  ListAdCampaignsResponse,
  CreateAdCampaignParams,
  CreateAdCampaignBody,
  CreateAdCampaignResponse,
  GetAdCampaignParams,
  GetAdCampaignResponse,
  UpdateAdCampaignParams,
  UpdateAdCampaignBody,
  UpdateAdCampaignResponse,
  DeleteAdCampaignParams,
  ListAdSetsParams,
  ListAdSetsResponse,
  CreateAdSetParams,
  CreateAdSetBody,
  CreateAdSetResponse,
  GetAdSetParams,
  GetAdSetResponse,
  UpdateAdSetParams,
  UpdateAdSetBody,
  UpdateAdSetResponse,
  DeleteAdSetParams,
  GetAdSetTargetingParams,
  GetAdSetTargetingResponse,
  SetAdSetTargetingParams,
  SetAdSetTargetingBody,
  SetAdSetTargetingResponse,
  ListAdSchedulesParams,
  ListAdSchedulesResponse,
  SetAdSchedulesParams,
  SetAdSchedulesBody,
  SetAdSchedulesResponse,
  ListAdsParams,
  ListAdsResponse,
  CreateAdParams,
  CreateAdBody,
  CreateAdResponse,
  GetAdParams,
  GetAdResponse,
  UpdateAdParams,
  UpdateAdBody,
  UpdateAdResponse,
  DeleteAdParams,
  SubmitAdForReviewParams,
  SubmitAdForReviewResponse,
  ListAdCreativesParams,
  ListAdCreativesResponse,
  CreateAdCreativeParams,
  CreateAdCreativeBody,
  CreateAdCreativeResponse,
  GetAdCreativeParams,
  GetAdCreativeResponse,
  UpdateAdCreativeParams,
  UpdateAdCreativeBody,
  UpdateAdCreativeResponse,
  DeleteAdCreativeParams,
  ListSavedAudiencesParams,
  ListSavedAudiencesResponse,
  CreateSavedAudienceParams,
  CreateSavedAudienceBody,
  CreateSavedAudienceResponse,
  UpdateSavedAudienceParams,
  UpdateSavedAudienceBody,
  UpdateSavedAudienceResponse,
  DeleteSavedAudienceParams,
  GetAdWalletParams,
  GetAdWalletResponse,
  ListAdWalletTransactionsParams,
  ListAdWalletTransactionsResponse,
  ListAdCouponsParams,
  ListAdCouponsResponse,
  RedeemCouponParams,
  RedeemCouponBody,
  RedeemCouponResponse,
  CreateWalletTopupParams,
  CreateWalletTopupBody,
  CreateWalletTopupResponse,
  ListCardsParams,
  ListCardsResponse,
  CreateCardSetupParams,
  CreateCardSetupResponse,
  SetDefaultCardParams,
  SetDefaultCardBody,
  SetDefaultCardResponse,
  RemoveCardParams,
  GetBillingSettingsParams,
  GetBillingSettingsResponse,
  UpdateBillingSettingsParams,
  UpdateBillingSettingsBody,
  UpdateBillingSettingsResponse,
  ServeAdsQueryParams,
  RecordAdImpressionParams,
  RecordAdImpressionBody,
  RecordAdClickParams,
  RecordAdClickBody,
  BoostPostParams,
  BoostPostBody,
  BoostPageParams,
  BoostPageBody,
  GetAdAccountInsightsQueryParams,
  GetAdAccountInsightsResponse,
  GetAdAccountPixelResponse,
  ListAdAccountConversionsQueryParams,
  ListAdAccountConversionsResponse,
  CapturePixelEventBody,
  CapturePixelEventResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// http(s)-only guard for any user-supplied URL (blocks javascript:/data:).
function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type Level = "read" | "ads" | "account";

/**
 * Resolve the requester's access to an ad account and enforce the required
 * level. Sends the appropriate 404/403 and returns null when access is denied;
 * otherwise returns the effective role.
 */
async function requireAccountAccess(
  res: Response,
  userId: string,
  accountId: number,
  level: Level,
): Promise<AdRole | null> {
  const { exists, role } = await resolveAdAccountAccess(userId, accountId);
  if (!exists) {
    res.status(404).json({ error: "Ad account not found" });
    return null;
  }
  const ok =
    level === "read"
      ? canRead(role)
      : level === "ads"
        ? canManageAds(role)
        : canManageAccount(role);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return role;
}

// ---------------------------------------------------------------------------
// Ad accounts
// ---------------------------------------------------------------------------

router.get("/ad-accounts", requireAuth, async (req, res): Promise<void> => {
  const uid = req.userId!;
  // Accounts the user owns OR is a member of.
  const owned = await db
    .select()
    .from(adAccountsTable)
    .where(eq(adAccountsTable.ownerId, uid));
  const memberRows = await db
    .select({ account: adAccountsTable, role: adAccountMembersTable.role })
    .from(adAccountMembersTable)
    .innerJoin(
      adAccountsTable,
      eq(adAccountMembersTable.accountId, adAccountsTable.id),
    )
    .where(eq(adAccountMembersTable.userId, uid));

  const byId = new Map<number, { account: typeof owned[number]; role: AdRole }>();
  for (const a of owned) byId.set(a.id, { account: a, role: "admin" });
  for (const m of memberRows) {
    if (!byId.has(m.account.id)) {
      byId.set(m.account.id, { account: m.account, role: m.role as AdRole });
    }
  }
  const out = [...byId.values()].map(({ account, role }) => ({
    ...account,
    viewerRole: role,
  }));
  out.sort((a, b) => b.id - a.id);
  res.json(ListAdAccountsResponse.parse(out));
});

router.post("/ad-accounts", requireAuth, async (req, res): Promise<void> => {
  const body = CreateAdAccountBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const uid = req.userId!;
  // Cap the number of ad accounts a single user can create (own).
  const MAX_AD_ACCOUNTS_PER_USER = 2;
  const ownedAccounts = await db
    .select({ id: adAccountsTable.id })
    .from(adAccountsTable)
    .where(eq(adAccountsTable.ownerId, uid));
  if (ownedAccounts.length >= MAX_AD_ACCOUNTS_PER_USER) {
    res.status(403).json({
      error: `You can create a maximum of ${MAX_AD_ACCOUNTS_PER_USER} ad accounts.`,
    });
    return;
  }
  const account = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(adAccountsTable)
      .values({
        ownerId: uid,
        name: body.data.name,
        currency: body.data.currency ?? "USD",
        timezone: body.data.timezone ?? "UTC",
      })
      .returning();
    // Record the owner as an explicit admin member for a complete team list.
    await tx.insert(adAccountMembersTable).values({
      accountId: created.id,
      userId: uid,
      role: "admin",
    });
    return created;
  });
  res
    .status(201)
    .json(CreateAdAccountResponse.parse({ ...account, viewerRole: "admin" }));
});

router.get("/ad-accounts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAdAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const role = await requireAccountAccess(res, req.userId!, params.data.id, "read");
  if (!role) return;
  const [account] = await db
    .select()
    .from(adAccountsTable)
    .where(eq(adAccountsTable.id, params.data.id));
  res.json(GetAdAccountResponse.parse({ ...account, viewerRole: role }));
});

router.patch("/ad-accounts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAdAccountParams.safeParse(req.params);
  const body = UpdateAdAccountBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const role = await requireAccountAccess(
    res,
    req.userId!,
    params.data.id,
    "account",
  );
  if (!role) return;
  await db
    .update(adAccountsTable)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.currency !== undefined
        ? { currency: body.data.currency }
        : {}),
      ...(body.data.timezone !== undefined
        ? { timezone: body.data.timezone }
        : {}),
      ...(body.data.status !== undefined ? { status: body.data.status } : {}),
    })
    .where(eq(adAccountsTable.id, params.data.id));
  const [account] = await db
    .select()
    .from(adAccountsTable)
    .where(eq(adAccountsTable.id, params.data.id));
  res.json(UpdateAdAccountResponse.parse({ ...account, viewerRole: role }));
});

// Transfer account ownership (Facebook-style). Only the CURRENT owner can do
// this. The old owner stays on as an admin member so they don't lose access.
router.post(
  "/ad-accounts/:id/transfer",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = TransferAdAccountParams.safeParse(req.params);
    const body = TransferAdAccountBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    if (!account) {
      res.status(404).json({ error: "Ad account not found" });
      return;
    }
    if (account.ownerId !== req.userId) {
      res.status(403).json({ error: "Only the account owner can transfer ownership" });
      return;
    }
    if (body.data.userId === req.userId) {
      res.status(400).json({ error: "You already own this account" });
      return;
    }
    const [target] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, body.data.userId));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await db.transaction(async (tx) => {
      await tx
        .update(adAccountsTable)
        .set({ ownerId: body.data.userId })
        .where(eq(adAccountsTable.id, params.data.id));
      // New owner no longer needs a member row.
      await tx
        .delete(adAccountMembersTable)
        .where(
          and(
            eq(adAccountMembersTable.accountId, params.data.id),
            eq(adAccountMembersTable.userId, body.data.userId),
          ),
        );
      // Keep the old owner on the account as an admin member.
      await tx
        .insert(adAccountMembersTable)
        .values({
          accountId: params.data.id,
          userId: req.userId!,
          role: "admin",
        })
        .onConflictDoUpdate({
          target: [
            adAccountMembersTable.accountId,
            adAccountMembersTable.userId,
          ],
          set: { role: "admin" },
        });
    });
    const [updated] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    res.json(
      TransferAdAccountResponse.parse({ ...updated, viewerRole: "admin" }),
    );
  },
);

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

router.get(
  "/ad-accounts/:id/members",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAdAccountMembersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const rows = await db
      .select()
      .from(adAccountMembersTable)
      .where(eq(adAccountMembersTable.accountId, params.data.id))
      .orderBy(desc(adAccountMembersTable.id));
    res.json(ListAdAccountMembersResponse.parse(rows));
  },
);

router.post(
  "/ad-accounts/:id/members",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = AddAdAccountMemberParams.safeParse(req.params);
    const body = AddAdAccountMemberBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    const [member] = await db
      .insert(adAccountMembersTable)
      .values({
        accountId: params.data.id,
        userId: body.data.userId,
        role: body.data.role,
      })
      .onConflictDoUpdate({
        target: [adAccountMembersTable.accountId, adAccountMembersTable.userId],
        set: { role: body.data.role },
      })
      .returning();
    res.status(201).json(AddAdAccountMemberResponse.parse(member));
  },
);

router.patch(
  "/ad-accounts/:id/members/:memberId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateAdAccountMemberParams.safeParse(req.params);
    const body = UpdateAdAccountMemberBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    const [existing] = await db
      .select()
      .from(adAccountMembersTable)
      .where(
        and(
          eq(adAccountMembersTable.id, params.data.memberId),
          eq(adAccountMembersTable.accountId, params.data.id),
        ),
      );
    if (!existing) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    const { ownerId } = await resolveAdAccountAccess(req.userId!, params.data.id);
    if (existing.userId === ownerId) {
      res.status(403).json({ error: "Cannot change the owner's role" });
      return;
    }
    await db
      .update(adAccountMembersTable)
      .set({ role: body.data.role })
      .where(eq(adAccountMembersTable.id, params.data.memberId));
    const [member] = await db
      .select()
      .from(adAccountMembersTable)
      .where(eq(adAccountMembersTable.id, params.data.memberId));
    res.json(UpdateAdAccountMemberResponse.parse(member));
  },
);

router.delete(
  "/ad-accounts/:id/members/:memberId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveAdAccountMemberParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    const [existing] = await db
      .select()
      .from(adAccountMembersTable)
      .where(
        and(
          eq(adAccountMembersTable.id, params.data.memberId),
          eq(adAccountMembersTable.accountId, params.data.id),
        ),
      );
    if (!existing) {
      res.sendStatus(204);
      return;
    }
    const { ownerId } = await resolveAdAccountAccess(req.userId!, params.data.id);
    if (existing.userId === ownerId) {
      res.status(403).json({ error: "Cannot remove the owner" });
      return;
    }
    await db
      .delete(adAccountMembersTable)
      .where(eq(adAccountMembersTable.id, params.data.memberId));
    res.sendStatus(204);
  },
);

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

router.get(
  "/ad-accounts/:id/campaigns",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAdCampaignsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const rows = await db
      .select()
      .from(adCampaignsTable)
      .where(eq(adCampaignsTable.accountId, params.data.id))
      .orderBy(desc(adCampaignsTable.id));
    res.json(ListAdCampaignsResponse.parse(rows));
  },
);

router.post(
  "/ad-accounts/:id/campaigns",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateAdCampaignParams.safeParse(req.params);
    const body = CreateAdCampaignBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "ads",
    );
    if (!role) return;
    const [campaign] = await db
      .insert(adCampaignsTable)
      .values({
        accountId: params.data.id,
        name: body.data.name,
        objective: body.data.objective ?? "traffic",
        status: body.data.status ?? "draft",
        dailyBudgetCents: body.data.dailyBudgetCents ?? null,
        lifetimeBudgetCents: body.data.lifetimeBudgetCents ?? null,
        createdBy: req.userId!,
      })
      .returning();
    res.status(201).json(CreateAdCampaignResponse.parse(campaign));
  },
);

router.get("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAdCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [campaign] = await db
    .select()
    .from(adCampaignsTable)
    .where(eq(adCampaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const role = await requireAccountAccess(
    res,
    req.userId!,
    campaign.accountId,
    "read",
  );
  if (!role) return;
  res.json(GetAdCampaignResponse.parse(campaign));
});

router.patch("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAdCampaignParams.safeParse(req.params);
  const body = UpdateAdCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [campaign] = await db
    .select()
    .from(adCampaignsTable)
    .where(eq(adCampaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const role = await requireAccountAccess(
    res,
    req.userId!,
    campaign.accountId,
    "ads",
  );
  if (!role) return;
  await db
    .update(adCampaignsTable)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.objective !== undefined
        ? { objective: body.data.objective }
        : {}),
      ...(body.data.status !== undefined ? { status: body.data.status } : {}),
      ...(body.data.dailyBudgetCents !== undefined
        ? { dailyBudgetCents: body.data.dailyBudgetCents }
        : {}),
      ...(body.data.lifetimeBudgetCents !== undefined
        ? { lifetimeBudgetCents: body.data.lifetimeBudgetCents }
        : {}),
    })
    .where(eq(adCampaignsTable.id, params.data.id));
  const [updated] = await db
    .select()
    .from(adCampaignsTable)
    .where(eq(adCampaignsTable.id, params.data.id));
  res.json(UpdateAdCampaignResponse.parse(updated));
});

router.delete("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAdCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [campaign] = await db
    .select()
    .from(adCampaignsTable)
    .where(eq(adCampaignsTable.id, params.data.id));
  if (!campaign) {
    res.sendStatus(204);
    return;
  }
  const role = await requireAccountAccess(
    res,
    req.userId!,
    campaign.accountId,
    "ads",
  );
  if (!role) return;
  await db.delete(adCampaignsTable).where(eq(adCampaignsTable.id, params.data.id));
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// Ad sets
// ---------------------------------------------------------------------------

router.get(
  "/campaigns/:id/ad-sets",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAdSetsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [campaign] = await db
      .select()
      .from(adCampaignsTable)
      .where(eq(adCampaignsTable.id, params.data.id));
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      campaign.accountId,
      "read",
    );
    if (!role) return;
    const rows = await db
      .select()
      .from(adSetsTable)
      .where(eq(adSetsTable.campaignId, params.data.id))
      .orderBy(desc(adSetsTable.id));
    res.json(ListAdSetsResponse.parse(rows));
  },
);

router.post(
  "/campaigns/:id/ad-sets",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateAdSetParams.safeParse(req.params);
    const body = CreateAdSetBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [campaign] = await db
      .select()
      .from(adCampaignsTable)
      .where(eq(adCampaignsTable.id, params.data.id));
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      campaign.accountId,
      "ads",
    );
    if (!role) return;
    if (
      body.data.savedAudienceId != null &&
      !(await savedAudienceInAccount(
        body.data.savedAudienceId,
        campaign.accountId,
      ))
    ) {
      res
        .status(400)
        .json({ error: "savedAudienceId does not belong to this ad account" });
      return;
    }
    const { targeting } = body.data;
    const adSet = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(adSetsTable)
        .values({
          campaignId: campaign.id,
          accountId: campaign.accountId,
          name: body.data.name,
          status: body.data.status ?? "draft",
          dailyBudgetCents: body.data.dailyBudgetCents ?? null,
          lifetimeBudgetCents: body.data.lifetimeBudgetCents ?? null,
          billingEvent: body.data.billingEvent ?? "impressions",
          optimizationGoal: body.data.optimizationGoal ?? "reach",
          savedAudienceId: body.data.savedAudienceId ?? null,
          startAt: body.data.startAt ?? null,
          endAt: body.data.endAt ?? null,
          createdBy: req.userId!,
        })
        .returning();
      if (targeting) {
        await tx.insert(adTargetingTable).values({
          adSetId: created.id,
          locations: targeting.locations ?? [],
          ageMin: targeting.ageMin ?? null,
          ageMax: targeting.ageMax ?? null,
          genders: targeting.genders ?? [],
          interests: targeting.interests ?? [],
          languages: targeting.languages ?? [],
          custom: targeting.custom ?? null,
        });
      }
      return created;
    });
    res.status(201).json(CreateAdSetResponse.parse(adSet));
  },
);

// Cross-account reference guards: a creative or saved audience may only be
// attached to an ad/ad set that lives in the SAME ad account. IDs are serial
// and predictable, so without this a member of account A could point at
// account B's resources (multi-tenant boundary break).
async function creativeInAccount(
  creativeId: number,
  accountId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: adCreativesTable.id })
    .from(adCreativesTable)
    .where(
      and(
        eq(adCreativesTable.id, creativeId),
        eq(adCreativesTable.accountId, accountId),
      ),
    );
  return !!row;
}

async function savedAudienceInAccount(
  audienceId: number,
  accountId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: adSavedAudiencesTable.id })
    .from(adSavedAudiencesTable)
    .where(
      and(
        eq(adSavedAudiencesTable.id, audienceId),
        eq(adSavedAudiencesTable.accountId, accountId),
      ),
    );
  return !!row;
}

// Load an ad set and enforce access at the given level. Returns the ad set or
// null (after sending the response).
async function loadAdSet(
  res: Response,
  userId: string,
  adSetId: number,
  level: Level,
): Promise<typeof adSetsTable.$inferSelect | null> {
  const [adSet] = await db
    .select()
    .from(adSetsTable)
    .where(eq(adSetsTable.id, adSetId));
  if (!adSet) {
    res.status(404).json({ error: "Ad set not found" });
    return null;
  }
  const role = await requireAccountAccess(res, userId, adSet.accountId, level);
  if (!role) return null;
  return adSet;
}

router.get("/ad-sets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAdSetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const adSet = await loadAdSet(res, req.userId!, params.data.id, "read");
  if (!adSet) return;
  res.json(GetAdSetResponse.parse(adSet));
});

router.patch("/ad-sets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAdSetParams.safeParse(req.params);
  const body = UpdateAdSetBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const adSet = await loadAdSet(res, req.userId!, params.data.id, "ads");
  if (!adSet) return;
  if (
    body.data.savedAudienceId != null &&
    !(await savedAudienceInAccount(body.data.savedAudienceId, adSet.accountId))
  ) {
    res
      .status(400)
      .json({ error: "savedAudienceId does not belong to this ad account" });
    return;
  }
  await db
    .update(adSetsTable)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.status !== undefined ? { status: body.data.status } : {}),
      ...(body.data.dailyBudgetCents !== undefined
        ? { dailyBudgetCents: body.data.dailyBudgetCents }
        : {}),
      ...(body.data.lifetimeBudgetCents !== undefined
        ? { lifetimeBudgetCents: body.data.lifetimeBudgetCents }
        : {}),
      ...(body.data.billingEvent !== undefined
        ? { billingEvent: body.data.billingEvent }
        : {}),
      ...(body.data.optimizationGoal !== undefined
        ? { optimizationGoal: body.data.optimizationGoal }
        : {}),
      ...(body.data.savedAudienceId !== undefined
        ? { savedAudienceId: body.data.savedAudienceId }
        : {}),
      ...(body.data.startAt !== undefined ? { startAt: body.data.startAt } : {}),
      ...(body.data.endAt !== undefined ? { endAt: body.data.endAt } : {}),
    })
    .where(eq(adSetsTable.id, params.data.id));
  const [updated] = await db
    .select()
    .from(adSetsTable)
    .where(eq(adSetsTable.id, params.data.id));
  res.json(UpdateAdSetResponse.parse(updated));
});

router.delete("/ad-sets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAdSetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [adSet] = await db
    .select()
    .from(adSetsTable)
    .where(eq(adSetsTable.id, params.data.id));
  if (!adSet) {
    res.sendStatus(204);
    return;
  }
  const role = await requireAccountAccess(res, req.userId!, adSet.accountId, "ads");
  if (!role) return;
  await db.delete(adSetsTable).where(eq(adSetsTable.id, params.data.id));
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// Targeting + schedules
// ---------------------------------------------------------------------------

router.get(
  "/ad-sets/:id/targeting",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetAdSetTargetingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const adSet = await loadAdSet(res, req.userId!, params.data.id, "read");
    if (!adSet) return;
    let [row] = await db
      .select()
      .from(adTargetingTable)
      .where(eq(adTargetingTable.adSetId, params.data.id));
    if (!row) {
      [row] = await db
        .insert(adTargetingTable)
        .values({ adSetId: params.data.id })
        .returning();
    }
    res.json(GetAdSetTargetingResponse.parse(row));
  },
);

router.put(
  "/ad-sets/:id/targeting",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetAdSetTargetingParams.safeParse(req.params);
    const body = SetAdSetTargetingBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const adSet = await loadAdSet(res, req.userId!, params.data.id, "ads");
    if (!adSet) return;
    const values = {
      adSetId: params.data.id,
      locations: body.data.locations ?? [],
      ageMin: body.data.ageMin ?? null,
      ageMax: body.data.ageMax ?? null,
      genders: body.data.genders ?? [],
      interests: body.data.interests ?? [],
      languages: body.data.languages ?? [],
      custom: body.data.custom ?? null,
    };
    const [row] = await db
      .insert(adTargetingTable)
      .values(values)
      .onConflictDoUpdate({
        target: adTargetingTable.adSetId,
        set: {
          locations: values.locations,
          ageMin: values.ageMin,
          ageMax: values.ageMax,
          genders: values.genders,
          interests: values.interests,
          languages: values.languages,
          custom: values.custom,
        },
      })
      .returning();
    res.json(SetAdSetTargetingResponse.parse(row));
  },
);

router.get(
  "/ad-sets/:id/schedules",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAdSchedulesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const adSet = await loadAdSet(res, req.userId!, params.data.id, "read");
    if (!adSet) return;
    const rows = await db
      .select()
      .from(adSchedulesTable)
      .where(eq(adSchedulesTable.adSetId, params.data.id))
      .orderBy(adSchedulesTable.id);
    res.json(ListAdSchedulesResponse.parse(rows));
  },
);

router.put(
  "/ad-sets/:id/schedules",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetAdSchedulesParams.safeParse(req.params);
    const body = SetAdSchedulesBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const adSet = await loadAdSet(res, req.userId!, params.data.id, "ads");
    if (!adSet) return;
    const rows = await db.transaction(async (tx) => {
      await tx
        .delete(adSchedulesTable)
        .where(eq(adSchedulesTable.adSetId, params.data.id));
      if (body.data.length === 0) return [];
      return tx
        .insert(adSchedulesTable)
        .values(
          body.data.map((s) => ({
            adSetId: params.data.id,
            dayOfWeek: s.dayOfWeek ?? null,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
          })),
        )
        .returning();
    });
    res.json(SetAdSchedulesResponse.parse(rows));
  },
);

// ---------------------------------------------------------------------------
// Ads
// ---------------------------------------------------------------------------

router.get("/ad-sets/:id/ads", requireAuth, async (req, res): Promise<void> => {
  const params = ListAdsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const adSet = await loadAdSet(res, req.userId!, params.data.id, "read");
  if (!adSet) return;
  const rows = await db
    .select()
    .from(adsTable)
    .where(eq(adsTable.adSetId, params.data.id))
    .orderBy(desc(adsTable.id));
  res.json(ListAdsResponse.parse(rows));
});

router.post("/ad-sets/:id/ads", requireAuth, async (req, res): Promise<void> => {
  const params = CreateAdParams.safeParse(req.params);
  const body = CreateAdBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const adSet = await loadAdSet(res, req.userId!, params.data.id, "ads");
  if (!adSet) return;
  if (body.data.destinationUrl && !isSafeUrl(body.data.destinationUrl)) {
    res.status(400).json({ error: "destinationUrl must be an http(s) URL" });
    return;
  }
  if (
    body.data.creativeId != null &&
    !(await creativeInAccount(body.data.creativeId, adSet.accountId))
  ) {
    res
      .status(400)
      .json({ error: "creativeId does not belong to this ad account" });
    return;
  }
  const [ad] = await db
    .insert(adsTable)
    .values({
      adSetId: adSet.id,
      accountId: adSet.accountId,
      name: body.data.name,
      creativeId: body.data.creativeId ?? null,
      status: body.data.status ?? "draft",
      destinationUrl: body.data.destinationUrl ?? null,
      createdBy: req.userId!,
    })
    .returning();
  res.status(201).json(CreateAdResponse.parse(ad));
});

async function loadAd(
  res: Response,
  userId: string,
  adId: number,
  level: Level,
): Promise<typeof adsTable.$inferSelect | null> {
  const [ad] = await db.select().from(adsTable).where(eq(adsTable.id, adId));
  if (!ad) {
    res.status(404).json({ error: "Ad not found" });
    return null;
  }
  const role = await requireAccountAccess(res, userId, ad.accountId, level);
  if (!role) return null;
  return ad;
}

// NOTE: this static route MUST be registered before "/ads/:id", otherwise
// Express matches "serve" as the :id param and the request 400s.
router.get("/ads/serve", requireAuth, async (req, res): Promise<void> => {
  const q = ServeAdsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const viewerId = req.userId!;
  const placement = q.data.placement ?? "feed";
  const limit = q.data.limit ?? 3;
  const now = new Date();

  // Eligible = approved + everything in the chain active. Flight window is
  // checked in JS to keep the null-handling readable.
  const rows = await db
    .select({ ad: adsTable, adSet: adSetsTable })
    .from(adsTable)
    .innerJoin(adSetsTable, eq(adsTable.adSetId, adSetsTable.id))
    .innerJoin(adCampaignsTable, eq(adSetsTable.campaignId, adCampaignsTable.id))
    .innerJoin(adAccountsTable, eq(adsTable.accountId, adAccountsTable.id))
    .where(
      and(
        eq(adsTable.reviewStatus, "approved"),
        eq(adsTable.status, "active"),
        eq(adSetsTable.status, "active"),
        eq(adCampaignsTable.status, "active"),
        eq(adAccountsTable.status, "active"),
      ),
    )
    .orderBy(desc(adsTable.createdAt))
    .limit(200);

  const inFlight = rows.filter(({ adSet }) => {
    if (adSet.startAt && adSet.startAt.getTime() > now.getTime()) return false;
    if (adSet.endAt && adSet.endAt.getTime() < now.getTime()) return false;
    return true;
  });
  if (inFlight.length === 0) {
    res.json([]);
    return;
  }

  // Budget / funds gate (dynamic + auto-recovering). Skip ads whose account has
  // no spendable funds, or whose ad set / campaign has exhausted its daily or
  // lifetime budget. Daily uses each account's own timezone day. Lifetime is
  // also enforced terminally at charge time; this is defense + covers the small
  // window before a pause is flushed.
  const gateAccountIds = [...new Set(inFlight.map((r) => r.ad.accountId))];
  const gateCampaignIds = [...new Set(inFlight.map((r) => r.adSet.campaignId))];
  const gateAdSetIds = [...new Set(inFlight.map((r) => r.adSet.id))];
  const [gateAccounts, gateCampaigns] = await Promise.all([
    db
      .select({
        id: adAccountsTable.id,
        balanceCents: adAccountsTable.balanceCents,
        creditBalanceCents: adAccountsTable.creditBalanceCents,
        timezone: adAccountsTable.timezone,
      })
      .from(adAccountsTable)
      .where(inArray(adAccountsTable.id, gateAccountIds)),
    db
      .select({
        id: adCampaignsTable.id,
        dailyBudgetCents: adCampaignsTable.dailyBudgetCents,
        lifetimeBudgetCents: adCampaignsTable.lifetimeBudgetCents,
        spentCents: adCampaignsTable.spentCents,
      })
      .from(adCampaignsTable)
      .where(inArray(adCampaignsTable.id, gateCampaignIds)),
  ]);
  const gateAccountById = new Map(gateAccounts.map((a) => [a.id, a]));
  const gateCampaignById = new Map(gateCampaigns.map((c) => [c.id, c]));
  const dayByAccount = new Map(
    gateAccounts.map((a) => [a.id, dayInTimezone(a.timezone, now)]),
  );
  const gateDays = [...new Set([...dayByAccount.values()])];
  const dailyRows =
    gateDays.length > 0
      ? await db
          .select({
            adSetId: adSpendDailyTable.adSetId,
            campaignId: adSpendDailyTable.campaignId,
            day: adSpendDailyTable.day,
            spentCents: adSpendDailyTable.spentCents,
          })
          .from(adSpendDailyTable)
          .where(
            and(
              inArray(adSpendDailyTable.adSetId, gateAdSetIds),
              inArray(adSpendDailyTable.day, gateDays),
            ),
          )
      : [];
  const adSetDailyByKey = new Map<string, number>();
  const campaignDailyByKey = new Map<string, number>();
  for (const r of dailyRows) {
    adSetDailyByKey.set(`${r.adSetId}:${r.day}`, r.spentCents);
    const ck = `${r.campaignId}:${r.day}`;
    campaignDailyByKey.set(ck, (campaignDailyByKey.get(ck) ?? 0) + r.spentCents);
  }

  const affordable = inFlight.filter(({ ad, adSet }) => {
    const acct = gateAccountById.get(ad.accountId);
    if (!acct) return false;
    if (acct.balanceCents + acct.creditBalanceCents <= 0) return false;
    const camp = gateCampaignById.get(adSet.campaignId);
    if (!camp) return false;
    if (
      adSet.lifetimeBudgetCents != null &&
      adSet.spentCents >= adSet.lifetimeBudgetCents
    )
      return false;
    if (
      camp.lifetimeBudgetCents != null &&
      camp.spentCents >= camp.lifetimeBudgetCents
    )
      return false;
    const day = dayByAccount.get(ad.accountId)!;
    if (
      adSet.dailyBudgetCents != null &&
      (adSetDailyByKey.get(`${adSet.id}:${day}`) ?? 0) >= adSet.dailyBudgetCents
    )
      return false;
    if (
      camp.dailyBudgetCents != null &&
      (campaignDailyByKey.get(`${camp.id}:${day}`) ?? 0) >= camp.dailyBudgetCents
    )
      return false;
    return true;
  });
  if (affordable.length === 0) {
    res.json([]);
    return;
  }

  const adIds = affordable.map((r) => r.ad.id);
  const adSetIds = [...new Set(affordable.map((r) => r.adSet.id))];
  const creativeIds = [
    ...new Set(
      inFlight.map((r) => r.ad.creativeId).filter((v): v is number => v != null),
    ),
  ];

  const [viewer] = await db
    .select({
      location: profilesTable.location,
      birthday: profilesTable.birthday,
    })
    .from(profilesTable)
    .where(eq(profilesTable.id, viewerId));

  const cutoff = new Date(now.getTime() - DEDUPE_WINDOW_MS);
  const [recent, targetingRows, creatives] = await Promise.all([
    db
      .select({ adId: adImpressionsTable.adId })
      .from(adImpressionsTable)
      .where(
        and(
          eq(adImpressionsTable.viewerId, viewerId),
          inArray(adImpressionsTable.adId, adIds),
          gt(adImpressionsTable.createdAt, cutoff),
        ),
      ),
    db
      .select()
      .from(adTargetingTable)
      .where(inArray(adTargetingTable.adSetId, adSetIds)),
    creativeIds.length > 0
      ? db
          .select()
          .from(adCreativesTable)
          .where(inArray(adCreativesTable.id, creativeIds))
      : Promise.resolve([]),
  ]);

  const recentlySeen = new Set(recent.map((r) => r.adId));
  const targetingByAdSet = new Map(targetingRows.map((t) => [t.adSetId, t]));
  const creativeById = new Map(creatives.map((c) => [c.id, c]));

  const eligible = affordable.filter(({ ad, adSet }) => {
    if (recentlySeen.has(ad.id)) return false;
    return matchesTargeting(targetingByAdSet.get(adSet.id), viewer ?? null);
  });

  // Rotate: light shuffle so the same ad is not always first.
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  // Resolve boosted post/page content (privacy guard: only PUBLIC posts).
  const postIds = [
    ...new Set(
      eligible
        .map((r) => r.ad.boostedPostId)
        .filter((v): v is number => v != null),
    ),
  ];
  const pageIds = [
    ...new Set(
      eligible
        .map((r) => r.ad.boostedPageId)
        .filter((v): v is number => v != null),
    ),
  ];
  const [postRows, pageRows] = await Promise.all([
    postIds.length > 0
      ? db.select().from(postsTable).where(inArray(postsTable.id, postIds))
      : Promise.resolve<(typeof postsTable.$inferSelect)[]>([]),
    pageIds.length > 0
      ? db.select().from(pagesTable).where(inArray(pagesTable.id, pageIds))
      : Promise.resolve<(typeof pagesTable.$inferSelect)[]>([]),
  ]);
  const publicPostRows = postRows.filter((p) => p.privacy === "public");
  const [builtPosts, builtPages] = await Promise.all([
    buildPosts(publicPostRows, viewerId),
    Promise.all(pageRows.map((p) => buildPage(p, viewerId))),
  ]);
  const postById = new Map(builtPosts.map((p) => [p.id, p]));
  const pageById = new Map(builtPages.map((p) => [p.id, p]));

  const items: unknown[] = [];
  for (const { ad } of eligible) {
    if (items.length >= limit) break;
    let boostedPost = null;
    if (ad.boostedPostId != null) {
      boostedPost = postById.get(ad.boostedPostId) ?? null;
      // Skip boosted-post ads whose post is gone or no longer public.
      if (!boostedPost) continue;
    }
    let boostedPage = null;
    if (ad.boostedPageId != null) {
      boostedPage = pageById.get(ad.boostedPageId) ?? null;
      if (!boostedPage) continue;
    }
    const creative =
      ad.creativeId != null ? (creativeById.get(ad.creativeId) ?? null) : null;
    items.push({
      adId: ad.id,
      accountId: ad.accountId,
      placement,
      name: ad.name,
      destinationUrl: ad.destinationUrl ?? null,
      creative,
      boostedPost,
      boostedPage,
    });
  }

  res.json(items);
});

// ---------------------------------------------------------------------------
// Public conversion pixel (no auth — authenticated by the signed pixel token).
// Registered BEFORE "/ads/:id" so the ".gif" path is not captured by that route.
// ---------------------------------------------------------------------------

// 1x1 transparent GIF beacon body.
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
  "base64",
);

router.get("/ads/pixel.gif", async (req, res): Promise<void> => {
  const token = String(req.query.token ?? "");
  const accountId = verifyPixelToken(token);
  if (accountId) {
    const valueCents = Number(req.query.value);
    const adRaw = req.query.ad != null ? Number(req.query.ad) : NaN;
    const viewer =
      req.query.viewer != null ? String(req.query.viewer) : req.userId ?? null;
    try {
      await capturePixelConversion({
        accountId,
        eventName: String(req.query.event ?? "conversion"),
        valueCents: Number.isFinite(valueCents) ? valueCents : 0,
        viewerId: viewer,
        adId: Number.isInteger(adRaw) ? adRaw : undefined,
        pixelId: token,
      });
    } catch (err) {
      req.log.error({ err }, "pixel gif conversion capture failed");
    }
  }
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.send(PIXEL_GIF);
});

router.post("/ads/pixel", async (req, res): Promise<void> => {
  const body = CapturePixelEventBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const accountId = verifyPixelToken(body.data.token);
  if (!accountId) {
    res.status(400).json({ error: "Invalid pixel token" });
    return;
  }
  try {
    const result = await capturePixelConversion({
      accountId,
      eventName: body.data.eventName,
      valueCents: body.data.valueCents,
      currency: body.data.currency,
      viewerId: body.data.viewerId ?? req.userId ?? null,
      adId: body.data.adId ?? undefined,
      pixelId: body.data.token,
      metadata: body.data.metadata ?? null,
    });
    res.json(
      CapturePixelEventResponse.parse({
        attributed: result.attributed,
        adId: result.adId,
      }),
    );
  } catch (err) {
    // Public, unauthenticated endpoint: never surface a 500 to pixel traffic.
    // Log and report the event as unattributed so bad input can't error the API.
    req.log.error({ err }, "pixel conversion capture failed");
    res.json(
      CapturePixelEventResponse.parse({ attributed: false, adId: null }),
    );
  }
});

router.get("/ads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ad = await loadAd(res, req.userId!, params.data.id, "read");
  if (!ad) return;
  res.json(GetAdResponse.parse(ad));
});

router.patch("/ads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAdParams.safeParse(req.params);
  const body = UpdateAdBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const ad = await loadAd(res, req.userId!, params.data.id, "ads");
  if (!ad) return;
  if (body.data.destinationUrl && !isSafeUrl(body.data.destinationUrl)) {
    res.status(400).json({ error: "destinationUrl must be an http(s) URL" });
    return;
  }
  if (
    body.data.creativeId != null &&
    !(await creativeInAccount(body.data.creativeId, ad.accountId))
  ) {
    res
      .status(400)
      .json({ error: "creativeId does not belong to this ad account" });
    return;
  }
  await db
    .update(adsTable)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.creativeId !== undefined
        ? { creativeId: body.data.creativeId }
        : {}),
      ...(body.data.status !== undefined ? { status: body.data.status } : {}),
      ...(body.data.destinationUrl !== undefined
        ? { destinationUrl: body.data.destinationUrl }
        : {}),
    })
    .where(eq(adsTable.id, params.data.id));
  const [updated] = await db
    .select()
    .from(adsTable)
    .where(eq(adsTable.id, params.data.id));
  res.json(UpdateAdResponse.parse(updated));
});

router.delete("/ads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [ad] = await db.select().from(adsTable).where(eq(adsTable.id, params.data.id));
  if (!ad) {
    res.sendStatus(204);
    return;
  }
  const role = await requireAccountAccess(res, req.userId!, ad.accountId, "ads");
  if (!role) return;
  await db.delete(adsTable).where(eq(adsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/ads/:id/submit", requireAuth, async (req, res): Promise<void> => {
  const params = SubmitAdForReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ad = await loadAd(res, req.userId!, params.data.id, "ads");
  if (!ad) return;
  // Reset review state so a resubmission goes back through the admin queue.
  await db
    .update(adsTable)
    .set({
      status: "in_review",
      reviewStatus: "pending",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    })
    .where(eq(adsTable.id, params.data.id));
  const [updated] = await db
    .select()
    .from(adsTable)
    .where(eq(adsTable.id, params.data.id));
  res.json(SubmitAdForReviewResponse.parse(updated));
});

// ---------------------------------------------------------------------------
// Creatives
// ---------------------------------------------------------------------------

router.get(
  "/ad-accounts/:id/creatives",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAdCreativesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const rows = await db
      .select()
      .from(adCreativesTable)
      .where(eq(adCreativesTable.accountId, params.data.id))
      .orderBy(desc(adCreativesTable.id));
    res.json(ListAdCreativesResponse.parse(rows));
  },
);

router.post(
  "/ad-accounts/:id/creatives",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateAdCreativeParams.safeParse(req.params);
    const body = CreateAdCreativeBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "ads",
    );
    if (!role) return;
    if (body.data.linkUrl && !isSafeUrl(body.data.linkUrl)) {
      res.status(400).json({ error: "linkUrl must be an http(s) URL" });
      return;
    }
    const badMedia = (body.data.mediaUrls ?? []).find((u) => !isSafeUrl(u));
    if (badMedia) {
      res.status(400).json({ error: "mediaUrls must be http(s) URLs" });
      return;
    }
    const [creative] = await db
      .insert(adCreativesTable)
      .values({
        accountId: params.data.id,
        name: body.data.name,
        format: body.data.format ?? "single_image",
        headline: body.data.headline ?? null,
        primaryText: body.data.primaryText ?? null,
        description: body.data.description ?? null,
        callToAction: body.data.callToAction ?? "learn_more",
        mediaUrls: body.data.mediaUrls ?? [],
        linkUrl: body.data.linkUrl ?? null,
        createdBy: req.userId!,
      })
      .returning();
    res.status(201).json(CreateAdCreativeResponse.parse(creative));
  },
);

async function loadCreative(
  res: Response,
  userId: string,
  creativeId: number,
  level: Level,
): Promise<typeof adCreativesTable.$inferSelect | null> {
  const [creative] = await db
    .select()
    .from(adCreativesTable)
    .where(eq(adCreativesTable.id, creativeId));
  if (!creative) {
    res.status(404).json({ error: "Creative not found" });
    return null;
  }
  const role = await requireAccountAccess(res, userId, creative.accountId, level);
  if (!role) return null;
  return creative;
}

router.get("/creatives/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAdCreativeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const creative = await loadCreative(res, req.userId!, params.data.id, "read");
  if (!creative) return;
  res.json(GetAdCreativeResponse.parse(creative));
});

router.patch("/creatives/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAdCreativeParams.safeParse(req.params);
  const body = UpdateAdCreativeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const creative = await loadCreative(res, req.userId!, params.data.id, "ads");
  if (!creative) return;
  if (body.data.linkUrl && !isSafeUrl(body.data.linkUrl)) {
    res.status(400).json({ error: "linkUrl must be an http(s) URL" });
    return;
  }
  const badMedia = (body.data.mediaUrls ?? []).find((u) => !isSafeUrl(u));
  if (badMedia) {
    res.status(400).json({ error: "mediaUrls must be http(s) URLs" });
    return;
  }
  await db
    .update(adCreativesTable)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.format !== undefined ? { format: body.data.format } : {}),
      ...(body.data.headline !== undefined
        ? { headline: body.data.headline }
        : {}),
      ...(body.data.primaryText !== undefined
        ? { primaryText: body.data.primaryText }
        : {}),
      ...(body.data.description !== undefined
        ? { description: body.data.description }
        : {}),
      ...(body.data.callToAction !== undefined
        ? { callToAction: body.data.callToAction }
        : {}),
      ...(body.data.mediaUrls !== undefined
        ? { mediaUrls: body.data.mediaUrls }
        : {}),
      ...(body.data.linkUrl !== undefined ? { linkUrl: body.data.linkUrl } : {}),
    })
    .where(eq(adCreativesTable.id, params.data.id));
  const [updated] = await db
    .select()
    .from(adCreativesTable)
    .where(eq(adCreativesTable.id, params.data.id));
  res.json(UpdateAdCreativeResponse.parse(updated));
});

router.delete("/creatives/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAdCreativeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [creative] = await db
    .select()
    .from(adCreativesTable)
    .where(eq(adCreativesTable.id, params.data.id));
  if (!creative) {
    res.sendStatus(204);
    return;
  }
  const role = await requireAccountAccess(
    res,
    req.userId!,
    creative.accountId,
    "ads",
  );
  if (!role) return;
  await db
    .delete(adCreativesTable)
    .where(eq(adCreativesTable.id, params.data.id));
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// Saved audiences
// ---------------------------------------------------------------------------

router.get(
  "/ad-accounts/:id/audiences",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListSavedAudiencesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const rows = await db
      .select()
      .from(adSavedAudiencesTable)
      .where(eq(adSavedAudiencesTable.accountId, params.data.id))
      .orderBy(desc(adSavedAudiencesTable.id));
    res.json(ListSavedAudiencesResponse.parse(rows));
  },
);

router.post(
  "/ad-accounts/:id/audiences",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateSavedAudienceParams.safeParse(req.params);
    const body = CreateSavedAudienceBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "ads",
    );
    if (!role) return;
    const [audience] = await db
      .insert(adSavedAudiencesTable)
      .values({
        accountId: params.data.id,
        name: body.data.name,
        spec: body.data.spec ?? {},
        createdBy: req.userId!,
      })
      .returning();
    res.status(201).json(CreateSavedAudienceResponse.parse(audience));
  },
);

async function loadAudience(
  res: Response,
  userId: string,
  audienceId: number,
  level: Level,
): Promise<typeof adSavedAudiencesTable.$inferSelect | null> {
  const [audience] = await db
    .select()
    .from(adSavedAudiencesTable)
    .where(eq(adSavedAudiencesTable.id, audienceId));
  if (!audience) {
    res.status(404).json({ error: "Audience not found" });
    return null;
  }
  const role = await requireAccountAccess(res, userId, audience.accountId, level);
  if (!role) return null;
  return audience;
}

router.patch("/audiences/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSavedAudienceParams.safeParse(req.params);
  const body = UpdateSavedAudienceBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const audience = await loadAudience(res, req.userId!, params.data.id, "ads");
  if (!audience) return;
  await db
    .update(adSavedAudiencesTable)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.spec !== undefined ? { spec: body.data.spec } : {}),
    })
    .where(eq(adSavedAudiencesTable.id, params.data.id));
  const [updated] = await db
    .select()
    .from(adSavedAudiencesTable)
    .where(eq(adSavedAudiencesTable.id, params.data.id));
  res.json(UpdateSavedAudienceResponse.parse(updated));
});

router.delete("/audiences/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSavedAudienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [audience] = await db
    .select()
    .from(adSavedAudiencesTable)
    .where(eq(adSavedAudiencesTable.id, params.data.id));
  if (!audience) {
    res.sendStatus(204);
    return;
  }
  const role = await requireAccountAccess(
    res,
    req.userId!,
    audience.accountId,
    "ads",
  );
  if (!role) return;
  await db
    .delete(adSavedAudiencesTable)
    .where(eq(adSavedAudiencesTable.id, params.data.id));
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// Wallet + coupons (read-only here; money movement is the Payments task)
// ---------------------------------------------------------------------------

router.get(
  "/ad-accounts/:id/wallet",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetAdWalletParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    const transactions = await db
      .select()
      .from(adWalletTransactionsTable)
      .where(eq(adWalletTransactionsTable.accountId, params.data.id))
      .orderBy(desc(adWalletTransactionsTable.id))
      .limit(20);
    res.json(
      GetAdWalletResponse.parse({
        accountId: account.id,
        balanceCents: account.balanceCents,
        creditBalanceCents: account.creditBalanceCents,
        spentCents: account.spentCents,
        spendLimitCents: account.spendLimitCents,
        currency: account.currency,
        autoRechargeEnabled: account.autoRechargeEnabled,
        transactions,
      }),
    );
  },
);

router.get(
  "/ad-accounts/:id/transactions",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAdWalletTransactionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const rows = await db
      .select()
      .from(adWalletTransactionsTable)
      .where(eq(adWalletTransactionsTable.accountId, params.data.id))
      .orderBy(desc(adWalletTransactionsTable.id));
    res.json(ListAdWalletTransactionsResponse.parse(rows));
  },
);

router.get(
  "/ad-accounts/:id/coupons",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAdCouponsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const rows = await db
      .select()
      .from(adCouponsTable)
      .where(eq(adCouponsTable.accountId, params.data.id))
      .orderBy(desc(adCouponsTable.id));
    res.json(ListAdCouponsResponse.parse(rows));
  },
);

// Redeem a coupon / ad-credit code into the account's PROMOTIONAL credit pool.
// Atomic + double-redeem safe: the coupon row is locked FOR UPDATE and its
// status flip happens in the same transaction as the credit.
router.post(
  "/ad-accounts/:id/coupons/redeem",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RedeemCouponParams.safeParse(req.params);
    const body = RedeemCouponBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    // Managing money requires account-level access.
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    const code = body.data.code.trim();

    try {
      const result = await db.transaction(async (tx) => {
        const [coupon] = await tx
          .select()
          .from(adCouponsTable)
          .where(eq(adCouponsTable.code, code))
          .for("update");
        if (!coupon) return { error: "not_found" as const };
        if (coupon.status !== "active") return { error: "used" as const };
        if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
          return { error: "expired" as const };
        }
        // A coupon may be pre-assigned to a specific account; if so it can only
        // be redeemed there.
        if (coupon.accountId != null && coupon.accountId !== params.data.id) {
          return { error: "not_found" as const };
        }

        const [account] = await tx
          .select()
          .from(adAccountsTable)
          .where(eq(adAccountsTable.id, params.data.id))
          .for("update");
        if (!account) return { error: "not_found" as const };

        const newCredit = account.creditBalanceCents + coupon.amountCents;
        const now = new Date();
        await tx
          .update(adCouponsTable)
          .set({
            status: "redeemed",
            accountId: params.data.id,
            redeemedBy: req.userId!,
            redeemedAt: now,
          })
          .where(eq(adCouponsTable.id, coupon.id));
        await tx.insert(adWalletTransactionsTable).values({
          accountId: params.data.id,
          type: "credit",
          amountCents: coupon.amountCents,
          currency: account.currency,
          balanceAfterCents: account.balanceCents + newCredit,
          description: `Coupon redeemed: ${coupon.code}`,
          referenceId: `coupon:${coupon.id}`,
          couponId: coupon.id,
          createdBy: req.userId!,
        });
        await tx
          .update(adAccountsTable)
          .set({ creditBalanceCents: newCredit })
          .where(eq(adAccountsTable.id, params.data.id));

        const [refreshed] = await tx
          .select()
          .from(adCouponsTable)
          .where(eq(adCouponsTable.id, coupon.id));
        return {
          ok: true as const,
          balanceCents: account.balanceCents,
          creditBalanceCents: newCredit,
          coupon: refreshed,
        };
      });

      if ("error" in result) {
        const msg =
          result.error === "not_found"
            ? "Coupon not found"
            : result.error === "expired"
              ? "Coupon has expired"
              : "Coupon has already been used";
        res.status(400).json({ error: msg });
        return;
      }
      res.json(
        RedeemCouponResponse.parse({
          balanceCents: result.balanceCents,
          creditBalanceCents: result.creditBalanceCents,
          coupon: result.coupon,
        }),
      );
    } catch (err) {
      req.log.error({ err }, "coupon redemption failed");
      res.status(500).json({ error: "Coupon redemption failed" });
    }
  },
);

// ---------------------------------------------------------------------------
// Payments (Stripe): top-up, saved cards, billing settings
// ---------------------------------------------------------------------------

// Absolute base URL to send the user back to after a Stripe Checkout redirect.
function dashboardBaseUrl(req: {
  headers: Record<string, unknown>;
}): string | null {
  const origin = req.headers["origin"];
  if (typeof origin === "string" && /^https?:\/\//.test(origin)) return origin;
  const referer = req.headers["referer"];
  if (typeof referer === "string") {
    try {
      return new URL(referer).origin;
    } catch {
      /* ignore */
    }
  }
  const env = process.env.ADS_DASHBOARD_URL;
  if (env && /^https?:\/\//.test(env)) return env;
  return null;
}

router.post(
  "/ad-accounts/:id/wallet/topup",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateWalletTopupParams.safeParse(req.params);
    const body = CreateWalletTopupBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    if (!stripeConfigured()) {
      res.status(503).json({ error: "Payments are not configured" });
      return;
    }
    const base = dashboardBaseUrl(req);
    if (!base) {
      res.status(400).json({ error: "Could not determine return URL" });
      return;
    }
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    try {
      const session = await createTopupCheckout({
        account,
        amountCents: body.data.amountCents,
        successUrl: `${base}/wallet?topup=success`,
        cancelUrl: `${base}/wallet?topup=cancel`,
      });
      res.json(CreateWalletTopupResponse.parse({ url: session.url }));
    } catch (err) {
      req.log.error({ err }, "topup checkout failed");
      res.status(502).json({ error: "Could not start checkout" });
    }
  },
);

router.get(
  "/ad-accounts/:id/cards",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListCardsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    if (!stripeConfigured()) {
      res.json(ListCardsResponse.parse([]));
      return;
    }
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    try {
      const cards = await listStripeCards(account);
      res.json(ListCardsResponse.parse(cards));
    } catch (err) {
      req.log.error({ err }, "list cards failed");
      res.status(502).json({ error: "Could not load cards" });
    }
  },
);

router.post(
  "/ad-accounts/:id/cards/setup",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateCardSetupParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    if (!stripeConfigured()) {
      res.status(503).json({ error: "Payments are not configured" });
      return;
    }
    const base = dashboardBaseUrl(req);
    if (!base) {
      res.status(400).json({ error: "Could not determine return URL" });
      return;
    }
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    try {
      const session = await createSetupCheckout({
        account,
        successUrl: `${base}/wallet?card=added`,
        cancelUrl: `${base}/wallet?card=cancel`,
      });
      res.json(CreateCardSetupResponse.parse({ url: session.url }));
    } catch (err) {
      req.log.error({ err }, "card setup checkout failed");
      res.status(502).json({ error: "Could not start card setup" });
    }
  },
);

router.post(
  "/ad-accounts/:id/cards/default",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetDefaultCardParams.safeParse(req.params);
    const body = SetDefaultCardBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    if (!stripeConfigured()) {
      res.status(503).json({ error: "Payments are not configured" });
      return;
    }
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    try {
      await setStripeDefaultCard(account, body.data.paymentMethodId);
      const [fresh] = await db
        .select()
        .from(adAccountsTable)
        .where(eq(adAccountsTable.id, params.data.id));
      const cards = await listStripeCards(fresh);
      res.json(SetDefaultCardResponse.parse(cards));
    } catch (err) {
      req.log.error({ err }, "set default card failed");
      res.status(502).json({ error: "Could not update card" });
    }
  },
);

router.delete(
  "/ad-accounts/:id/cards/:paymentMethodId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveCardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    if (!stripeConfigured()) {
      res.sendStatus(204);
      return;
    }
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    try {
      await removeStripeCard(account, params.data.paymentMethodId);
      res.sendStatus(204);
    } catch (err) {
      req.log.error({ err }, "remove card failed");
      res.status(502).json({ error: "Could not remove card" });
    }
  },
);

function serializeBillingSettings(
  account: typeof adAccountsTable.$inferSelect,
) {
  return {
    spendLimitCents: account.spendLimitCents,
    autoRechargeEnabled: account.autoRechargeEnabled,
    autoRechargeThresholdCents: account.autoRechargeThresholdCents,
    autoRechargeAmountCents: account.autoRechargeAmountCents,
    hasPaymentMethod: !!account.defaultPaymentMethodId,
    defaultPaymentMethodId: account.defaultPaymentMethodId,
    paymentsEnabled: stripeConfigured(),
  };
}

router.get(
  "/ad-accounts/:id/billing/settings",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetBillingSettingsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "read",
    );
    if (!role) return;
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    res.json(GetBillingSettingsResponse.parse(serializeBillingSettings(account)));
  },
);

router.patch(
  "/ad-accounts/:id/billing/settings",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateBillingSettingsParams.safeParse(req.params);
    const body = UpdateBillingSettingsBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const role = await requireAccountAccess(
      res,
      req.userId!,
      params.data.id,
      "account",
    );
    if (!role) return;
    const [account] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));

    const wantsAutoRecharge =
      body.data.autoRechargeEnabled ?? account.autoRechargeEnabled;
    // Auto-recharge requires a saved default card.
    if (wantsAutoRecharge && !account.defaultPaymentMethodId) {
      res.status(400).json({
        error: "Add a payment method before enabling automatic top-ups",
      });
      return;
    }

    await db
      .update(adAccountsTable)
      .set({
        ...(body.data.spendLimitCents !== undefined
          ? { spendLimitCents: body.data.spendLimitCents }
          : {}),
        ...(body.data.autoRechargeEnabled !== undefined
          ? { autoRechargeEnabled: body.data.autoRechargeEnabled }
          : {}),
        ...(body.data.autoRechargeThresholdCents !== undefined
          ? { autoRechargeThresholdCents: body.data.autoRechargeThresholdCents }
          : {}),
        ...(body.data.autoRechargeAmountCents !== undefined
          ? { autoRechargeAmountCents: body.data.autoRechargeAmountCents }
          : {}),
      })
      .where(eq(adAccountsTable.id, params.data.id));
    const [fresh] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));
    res.json(
      UpdateBillingSettingsResponse.parse(serializeBillingSettings(fresh)),
    );
  },
);

// ---------------------------------------------------------------------------
// Serving + tracking
// ---------------------------------------------------------------------------

// How long we suppress re-showing the same ad to the same viewer.
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
// How long two impressions/clicks from the same viewer+ad are collapsed.
const TRACK_DEDUPE_MS = 60 * 1000;

type ViewerProfile = { location: string | null; birthday: string | null };

function ageFromBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const d = new Date(birthday);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// Best-effort targeting match. We only EXCLUDE when we can positively determine
// a mismatch from data we actually have (location text + age from birthday);
// missing viewer data is treated permissively so ads still serve.
function matchesTargeting(
  t: AdTargeting | undefined,
  viewer: ViewerProfile | null,
): boolean {
  if (!t) return true;
  if (t.locations.length > 0 && viewer?.location) {
    const loc = viewer.location.toLowerCase();
    const hit = t.locations.some(
      (x) => loc.includes(x.toLowerCase()) || x.toLowerCase().includes(loc),
    );
    if (!hit) return false;
  }
  const age = ageFromBirthday(viewer?.birthday ?? null);
  if (age != null) {
    if (t.ageMin != null && age < t.ageMin) return false;
    if (t.ageMax != null && age > t.ageMax) return false;
  }
  return true;
}

// Load an approved+active ad for tracking. Returns null (after responding 404)
// when the ad does not exist / is not servable.
async function loadServableAd(
  res: Response,
  adId: number,
): Promise<typeof adsTable.$inferSelect | null> {
  const [ad] = await db.select().from(adsTable).where(eq(adsTable.id, adId));
  if (!ad || ad.reviewStatus !== "approved") {
    res.status(404).json({ error: "Ad not found" });
    return null;
  }
  return ad;
}

router.post(
  "/ads/:id/impression",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RecordAdImpressionParams.safeParse(req.params);
    const body = RecordAdImpressionBody.safeParse(req.body ?? {});
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const ad = await loadServableAd(res, params.data.id);
    if (!ad) return;
    const viewerId = req.userId!;
    const cutoff = new Date(Date.now() - TRACK_DEDUPE_MS);
    const [dup] = await db
      .select({ id: adImpressionsTable.id })
      .from(adImpressionsTable)
      .where(
        and(
          eq(adImpressionsTable.adId, ad.id),
          eq(adImpressionsTable.viewerId, viewerId),
          gt(adImpressionsTable.createdAt, cutoff),
        ),
      );
    if (!dup) {
      const result = await chargeAdEvent({
        ad,
        event: "impression",
        viewerId,
        placement: body.data.placement ?? null,
        dedupeMs: TRACK_DEDUPE_MS,
      });
      if (result.shouldAutoRecharge) {
        void maybeAutoRecharge(ad.accountId).catch(() => {});
      }
    }
    res.sendStatus(204);
  },
);

router.post("/ads/:id/click", requireAuth, async (req, res): Promise<void> => {
  const params = RecordAdClickParams.safeParse(req.params);
  const body = RecordAdClickBody.safeParse(req.body ?? {});
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const ad = await loadServableAd(res, params.data.id);
  if (!ad) return;
  const viewerId = req.userId!;
  const cutoff = new Date(Date.now() - TRACK_DEDUPE_MS);
  const [dup] = await db
    .select({ id: adClicksTable.id })
    .from(adClicksTable)
    .where(
      and(
        eq(adClicksTable.adId, ad.id),
        eq(adClicksTable.viewerId, viewerId),
        gt(adClicksTable.createdAt, cutoff),
      ),
    );
  if (!dup) {
    const result = await chargeAdEvent({
      ad,
      event: "click",
      viewerId,
      placement: body.data.placement ?? null,
      dedupeMs: TRACK_DEDUPE_MS,
    });
    if (result.shouldAutoRecharge) {
      void maybeAutoRecharge(ad.accountId).catch(() => {});
    }
  }
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// Boost (lightweight ad creation from a post / page)
// ---------------------------------------------------------------------------

// Find (or lazily create) the caller's default ad account so a first-time
// boost just works without them ever opening the Ads Manager.
async function ensureDefaultAdAccount(userId: string): Promise<number> {
  const [existing] = await db
    .select({ id: adAccountsTable.id })
    .from(adAccountsTable)
    .where(eq(adAccountsTable.ownerId, userId))
    .orderBy(adAccountsTable.id)
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(adAccountsTable)
    .values({ ownerId: userId, name: "My Ads", currency: "USD" })
    .returning({ id: adAccountsTable.id });
  return created.id;
}

// Shared boost pipeline: account -> campaign -> ad set -> creative -> ad,
// submitted for admin review. Returns the created ad row.
async function createBoostAd(opts: {
  userId: string;
  objective: "post_boost" | "page_boost";
  budgetCents: number;
  days: number;
  name: string;
  headline: string;
  primaryText: string | null;
  callToAction: string;
  destinationUrl: string | null;
  boostedPostId?: number;
  boostedPageId?: number;
}): Promise<typeof adsTable.$inferSelect> {
  const accountId = await ensureDefaultAdAccount(opts.userId);
  const now = new Date();
  const endAt = new Date(now.getTime() + opts.days * 24 * 60 * 60 * 1000);

  const [campaign] = await db
    .insert(adCampaignsTable)
    .values({
      accountId,
      name: opts.name,
      objective: opts.objective,
      status: "active",
      lifetimeBudgetCents: opts.budgetCents,
      createdBy: opts.userId,
    })
    .returning({ id: adCampaignsTable.id });

  const [adSet] = await db
    .insert(adSetsTable)
    .values({
      campaignId: campaign.id,
      accountId,
      name: opts.name,
      status: "active",
      lifetimeBudgetCents: opts.budgetCents,
      startAt: now,
      endAt,
      createdBy: opts.userId,
    })
    .returning({ id: adSetsTable.id });

  const [creative] = await db
    .insert(adCreativesTable)
    .values({
      accountId,
      name: opts.name,
      format: "single_image",
      headline: opts.headline,
      primaryText: opts.primaryText,
      callToAction: opts.callToAction,
      linkUrl: opts.destinationUrl,
      createdBy: opts.userId,
    })
    .returning({ id: adCreativesTable.id });

  const [ad] = await db
    .insert(adsTable)
    .values({
      adSetId: adSet.id,
      accountId,
      creativeId: creative.id,
      name: opts.name,
      status: "in_review",
      reviewStatus: "pending",
      destinationUrl: opts.destinationUrl,
      boostedPostId: opts.boostedPostId ?? null,
      boostedPageId: opts.boostedPageId ?? null,
      createdBy: opts.userId,
    })
    .returning();
  return ad;
}

router.post("/posts/:id/boost", requireAuth, async (req, res): Promise<void> => {
  const params = BoostPostParams.safeParse(req.params);
  const body = BoostPostBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (body.data.destinationUrl && !isSafeUrl(body.data.destinationUrl)) {
    res.status(400).json({ error: "destinationUrl must be an http(s) URL" });
    return;
  }
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (post.authorId !== req.userId!) {
    res.status(403).json({ error: "You can only boost your own posts" });
    return;
  }
  if (post.privacy !== "public") {
    res.status(400).json({ error: "Only public posts can be boosted" });
    return;
  }
  const snippet = (post.content ?? "").trim().slice(0, 60);
  const ad = await createBoostAd({
    userId: req.userId!,
    objective: "post_boost",
    budgetCents: body.data.budgetCents,
    days: body.data.days,
    name: `Boosted post #${post.id}`,
    headline: body.data.headline?.trim() || snippet || "Sponsored post",
    primaryText: post.content ?? null,
    callToAction: body.data.callToAction ?? "learn_more",
    destinationUrl: body.data.destinationUrl ?? null,
    boostedPostId: post.id,
  });
  res.status(201).json(GetAdResponse.parse(ad));
});

router.post("/pages/:id/boost", requireAuth, async (req, res): Promise<void> => {
  const params = BoostPageParams.safeParse(req.params);
  const body = BoostPageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (body.data.destinationUrl && !isSafeUrl(body.data.destinationUrl)) {
    res.status(400).json({ error: "destinationUrl must be an http(s) URL" });
    return;
  }
  const [page] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, params.data.id));
  if (!page) {
    res.status(404).json({ error: "Hub not found" });
    return;
  }
  if (page.createdBy !== req.userId!) {
    res.status(403).json({ error: "You can only boost your own hubs" });
    return;
  }
  const ad = await createBoostAd({
    userId: req.userId!,
    objective: "page_boost",
    budgetCents: body.data.budgetCents,
    days: body.data.days,
    name: `Boosted hub #${page.id}`,
    headline: body.data.headline?.trim() || page.name,
    primaryText: page.description ?? null,
    callToAction: body.data.callToAction ?? "learn_more",
    destinationUrl: body.data.destinationUrl ?? null,
    boostedPageId: page.id,
  });
  res.status(201).json(GetAdResponse.parse(ad));
});

// ---------------------------------------------------------------------------
// Analytics + insights
// ---------------------------------------------------------------------------

/** Parse a from/to bound. Date-only "to" is treated as inclusive (end of day). */
function parseRangeBound(
  value: string | undefined,
  fallback: Date,
  inclusiveEndDay: boolean,
): Date {
  if (!value) return fallback;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(d.getTime())) return fallback;
  if (dateOnly && inclusiveEndDay) {
    return new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
  return d;
}

router.get(
  "/ad-accounts/:id/insights",
  requireAuth,
  async (req, res): Promise<void> => {
    const accountId = Number(req.params.id);
    if (!Number.isInteger(accountId)) {
      res.status(404).json({ error: "Ad account not found" });
      return;
    }
    const role = await requireAccountAccess(res, req.userId!, accountId, "read");
    if (!role) return;
    const q = GetAdAccountInsightsQueryParams.safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: q.error.message });
      return;
    }
    const now = new Date();
    const to = parseRangeBound(q.data.to, now, true);
    const from = parseRangeBound(
      q.data.from,
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      false,
    );
    if (from.getTime() >= to.getTime()) {
      res.status(400).json({ error: "Invalid date range" });
      return;
    }
    const [acct] = await db
      .select({ timezone: adAccountsTable.timezone })
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, accountId))
      .limit(1);
    const result = await getInsights({
      accountId,
      from,
      to,
      level: (q.data.level ?? "campaign") as InsightsLevel,
      timezone: acct?.timezone ?? "UTC",
      campaignId: q.data.campaignId,
      adSetId: q.data.adSetId,
    });
    res.json(GetAdAccountInsightsResponse.parse(result));
  },
);

router.get(
  "/ad-accounts/:id/pixel",
  requireAuth,
  async (req, res): Promise<void> => {
    const accountId = Number(req.params.id);
    if (!Number.isInteger(accountId)) {
      res.status(404).json({ error: "Ad account not found" });
      return;
    }
    const role = await requireAccountAccess(res, req.userId!, accountId, "read");
    if (!role) return;
    const token = signPixelToken(accountId);
    const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol);
    const host = req.get("host") ?? "";
    const gifUrl = `${proto}://${host}/api/ads/pixel.gif?token=${encodeURIComponent(
      token,
    )}&event=purchase&value=0`;
    const snippet = `<img src="${gifUrl}" width="1" height="1" alt="" style="display:none" referrerpolicy="no-referrer-when-downgrade" />`;
    res.json(GetAdAccountPixelResponse.parse({ token, gifUrl, snippet }));
  },
);

router.get(
  "/ad-accounts/:id/conversions",
  requireAuth,
  async (req, res): Promise<void> => {
    const accountId = Number(req.params.id);
    if (!Number.isInteger(accountId)) {
      res.status(404).json({ error: "Ad account not found" });
      return;
    }
    const role = await requireAccountAccess(res, req.userId!, accountId, "read");
    if (!role) return;
    const q = ListAdAccountConversionsQueryParams.safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: q.error.message });
      return;
    }
    const list = await listConversions({ accountId, limit: q.data.limit ?? 50 });
    res.json(ListAdAccountConversionsResponse.parse(list));
  },
);

export default router;

