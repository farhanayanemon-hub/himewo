import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { db, pool, profilesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import app from "../app";

// Locks in the Ads Backend Foundation (Task #1): the Ad Account -> Campaign ->
// Ad Set -> Ad hierarchy, targeting/schedules, saved audiences, submit-for-
// review, team roles (admin/advertiser/analyst) enforcement, http(s)-only URL
// guards on user-supplied links, and read-only wallet/coupon endpoints.

const owner = randomUUID();
const advertiser = randomUUID();
const analyst = randomUUID();
const stranger = randomUUID();
const slug = owner.slice(0, 8);

let server: Server;
let baseUrl: string;

async function api(
  path: string,
  asUser: string,
  init: RequestInit = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer dev:${asUser}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

beforeAll(async () => {
  await db.insert(profilesTable).values([
    { id: owner, username: `ads-owner-${slug}`, displayName: "Ads Owner" },
    { id: advertiser, username: `ads-adv-${slug}`, displayName: "Ads Adv" },
    { id: analyst, username: `ads-analyst-${slug}`, displayName: "Ads Analyst" },
    { id: stranger, username: `ads-stranger-${slug}`, displayName: "Ads Str" },
  ]);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  // Deleting the profiles cascades to owned ad accounts and everything under
  // them (members, campaigns, ad sets, ads, targeting, schedules, etc.).
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [owner, advertiser, analyst, stranger]));
  await pool.end();
});

describe("Ads backend foundation", () => {
  let accountId: number;
  let campaignId: number;
  let adSetId: number;
  let adId: number;

  it("creates an ad account with the creator as admin", async () => {
    const res = await api("/ad-accounts", owner, {
      method: "POST",
      body: JSON.stringify({ name: "Acme Ads", currency: "USD" }),
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Acme Ads");
    expect(res.body.viewerRole).toBe("admin");
    accountId = res.body.id;

    const list = await api("/ad-accounts", owner);
    expect(list.status).toBe(200);
    expect(list.body.some((a: any) => a.id === accountId)).toBe(true);
  });

  it("hides the account from non-members", async () => {
    const res = await api(`/ad-accounts/${accountId}`, stranger);
    expect(res.status).toBe(403);

    const list = await api("/ad-accounts", stranger);
    expect(list.body.some((a: any) => a.id === accountId)).toBe(false);
  });

  it("builds the campaign -> ad set -> ad hierarchy", async () => {
    const campaign = await api(`/ad-accounts/${accountId}/campaigns`, owner, {
      method: "POST",
      body: JSON.stringify({ name: "Launch", objective: "traffic" }),
    });
    expect(campaign.status).toBe(201);
    campaignId = campaign.body.id;

    const adSet = await api(`/campaigns/${campaignId}/ad-sets`, owner, {
      method: "POST",
      body: JSON.stringify({
        name: "Set A",
        billingEvent: "impressions",
        targeting: { locations: ["BD"], ageMin: 18, ageMax: 35 },
      }),
    });
    expect(adSet.status).toBe(201);
    adSetId = adSet.body.id;

    // Inline targeting from the ad set create should be readable back.
    const targeting = await api(`/ad-sets/${adSetId}/targeting`, owner);
    expect(targeting.status).toBe(200);
    expect(targeting.body.locations).toContain("BD");
    expect(targeting.body.ageMin).toBe(18);

    const ad = await api(`/ad-sets/${adSetId}/ads`, owner, {
      method: "POST",
      body: JSON.stringify({
        name: "Ad 1",
        destinationUrl: "https://acme.example/landing",
      }),
    });
    expect(ad.status).toBe(201);
    expect(ad.body.status).toBe("draft");
    expect(ad.body.reviewStatus).toBe("pending");
    adId = ad.body.id;
  });

  it("submits an ad for review", async () => {
    const res = await api(`/ads/${adId}/submit`, owner, { method: "POST" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_review");
    expect(res.body.reviewStatus).toBe("pending");
  });

  it("rejects non-http(s) destination and link URLs", async () => {
    const badAd = await api(`/ad-sets/${adSetId}/ads`, owner, {
      method: "POST",
      body: JSON.stringify({
        name: "Bad Ad",
        destinationUrl: "javascript:alert(1)",
      }),
    });
    expect(badAd.status).toBe(400);

    const badCreative = await api(`/ad-accounts/${accountId}/creatives`, owner, {
      method: "POST",
      body: JSON.stringify({ name: "Bad", linkUrl: "javascript:alert(1)" }),
    });
    expect(badCreative.status).toBe(400);
  });

  it("saves and updates targeting for an ad set", async () => {
    const put = await api(`/ad-sets/${adSetId}/targeting`, owner, {
      method: "PUT",
      body: JSON.stringify({
        locations: ["US", "BD"],
        interests: ["tech"],
        ageMin: 21,
      }),
    });
    expect(put.status).toBe(200);
    expect(put.body.interests).toContain("tech");

    const get = await api(`/ad-sets/${adSetId}/targeting`, owner);
    expect(get.body.locations).toEqual(expect.arrayContaining(["US", "BD"]));
    expect(get.body.ageMin).toBe(21);
  });

  it("replaces the ad set schedule via PUT", async () => {
    const put = await api(`/ad-sets/${adSetId}/schedules`, owner, {
      method: "PUT",
      body: JSON.stringify([
        { dayOfWeek: 1, startMinute: 540, endMinute: 1020 },
        { dayOfWeek: 2, startMinute: 540, endMinute: 1020 },
      ]),
    });
    expect(put.status).toBe(200);
    expect(put.body).toHaveLength(2);

    const get = await api(`/ad-sets/${adSetId}/schedules`, owner);
    expect(get.body).toHaveLength(2);
  });

  it("creates and lists a saved audience", async () => {
    const create = await api(`/ad-accounts/${accountId}/audiences`, owner, {
      method: "POST",
      body: JSON.stringify({
        name: "Young adults",
        spec: { ageMin: 18, ageMax: 30, locations: ["BD"] },
      }),
    });
    expect(create.status).toBe(201);
    expect(create.body.spec.ageMax).toBe(30);

    const list = await api(`/ad-accounts/${accountId}/audiences`, owner);
    expect(list.body.some((a: any) => a.id === create.body.id)).toBe(true);
  });

  it("exposes an empty wallet and coupon list", async () => {
    const wallet = await api(`/ad-accounts/${accountId}/wallet`, owner);
    expect(wallet.status).toBe(200);
    expect(wallet.body.balanceCents).toBe(0);
    expect(wallet.body.transactions).toEqual([]);

    const coupons = await api(`/ad-accounts/${accountId}/coupons`, owner);
    expect(coupons.status).toBe(200);
    expect(coupons.body).toEqual([]);
  });

  it("enforces team roles", async () => {
    // Owner (admin) adds an advertiser and an analyst.
    const addAdv = await api(`/ad-accounts/${accountId}/members`, owner, {
      method: "POST",
      body: JSON.stringify({ userId: advertiser, role: "advertiser" }),
    });
    expect(addAdv.status).toBe(201);
    const addAnalyst = await api(`/ad-accounts/${accountId}/members`, owner, {
      method: "POST",
      body: JSON.stringify({ userId: analyst, role: "analyst" }),
    });
    expect(addAnalyst.status).toBe(201);

    // Advertiser can create a campaign...
    const advCampaign = await api(
      `/ad-accounts/${accountId}/campaigns`,
      advertiser,
      {
        method: "POST",
        body: JSON.stringify({ name: "Adv campaign" }),
      },
    );
    expect(advCampaign.status).toBe(201);

    // ...but cannot manage members (admin-only).
    const advAddMember = await api(`/ad-accounts/${accountId}/members`, advertiser, {
      method: "POST",
      body: JSON.stringify({ userId: stranger, role: "analyst" }),
    });
    expect(advAddMember.status).toBe(403);

    // Analyst can read...
    const analystRead = await api(`/ad-accounts/${accountId}/campaigns`, analyst);
    expect(analystRead.status).toBe(200);

    // ...but cannot create campaigns.
    const analystWrite = await api(
      `/ad-accounts/${accountId}/campaigns`,
      analyst,
      {
        method: "POST",
        body: JSON.stringify({ name: "Nope" }),
      },
    );
    expect(analystWrite.status).toBe(403);
  });

  it("rejects cross-account creative and audience references", async () => {
    // Stranger owns a SEPARATE ad account with its own creative + audience.
    const otherAccount = await api("/ad-accounts", stranger, {
      method: "POST",
      body: JSON.stringify({ name: "Rival Ads" }),
    });
    expect(otherAccount.status).toBe(201);
    const otherId = otherAccount.body.id;

    const foreignCreative = await api(
      `/ad-accounts/${otherId}/creatives`,
      stranger,
      {
        method: "POST",
        body: JSON.stringify({ name: "Rival creative" }),
      },
    );
    expect(foreignCreative.status).toBe(201);

    const foreignAudience = await api(
      `/ad-accounts/${otherId}/audiences`,
      stranger,
      {
        method: "POST",
        body: JSON.stringify({ name: "Rival aud", spec: { ageMin: 20 } }),
      },
    );
    expect(foreignAudience.status).toBe(201);

    // The owner cannot attach the rival account's creative to their own ad.
    const badAd = await api(`/ad-sets/${adSetId}/ads`, owner, {
      method: "POST",
      body: JSON.stringify({
        name: "Cross ad",
        creativeId: foreignCreative.body.id,
      }),
    });
    expect(badAd.status).toBe(400);

    // ...nor patch an existing ad to point at it.
    const patchAd = await api(`/ads/${adId}`, owner, {
      method: "PATCH",
      body: JSON.stringify({ creativeId: foreignCreative.body.id }),
    });
    expect(patchAd.status).toBe(400);

    // ...nor attach the rival account's saved audience to an ad set.
    const badSet = await api(`/campaigns/${campaignId}/ad-sets`, owner, {
      method: "POST",
      body: JSON.stringify({
        name: "Cross set",
        savedAudienceId: foreignAudience.body.id,
      }),
    });
    expect(badSet.status).toBe(400);

    const patchSet = await api(`/ad-sets/${adSetId}`, owner, {
      method: "PATCH",
      body: JSON.stringify({ savedAudienceId: foreignAudience.body.id }),
    });
    expect(patchSet.status).toBe(400);
  });
});
