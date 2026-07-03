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
  type AdRole,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  resolveAdAccountAccess,
  canRead,
  canManageAds,
  canManageAccount,
} from "../lib/ads-auth";
import {
  ListAdAccountsResponse,
  CreateAdAccountBody,
  CreateAdAccountResponse,
  GetAdAccountParams,
  GetAdAccountResponse,
  UpdateAdAccountParams,
  UpdateAdAccountBody,
  UpdateAdAccountResponse,
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
        currency: account.currency,
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

export default router;
