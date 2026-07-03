import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  adCampaignsTable,
  adSetsTable,
  adsTable,
  adImpressionsTable,
  adClicksTable,
  adConversionsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import app from "../app";
import { signPixelToken, verifyPixelToken } from "../lib/analytics";

// Task #5 (Ads Analytics + Insights): locks the aggregation engine
// (impressions / reach / clicks / CTR / spend), spend↔billing reconciliation
// (spend is summed from the same per-event cost_cents the billing engine
// charged), the HMAC pixel token, and last-click conversion attribution.

const owner = randomUUID();
const stranger = randomUUID();
const viewer1 = randomUUID();
const viewer2 = randomUUID();
const slug = owner.slice(0, 8);

let server: Server;
let baseUrl: string;
let accountId: number;
let adId: number;

// Known seeded spend (cents) — asserted independently against insights.
const IMPRESSION_COST = 10;
const CLICK_COST = 25;
const SEEDED_SPEND = IMPRESSION_COST * 3 + CLICK_COST * 1; // 55

async function api(
  path: string,
  asUser: string | null,
  init: RequestInit = {},
): Promise<{ status: number; body: any; contentType: string | null }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(asUser ? { authorization: `Bearer dev:${asUser}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const contentType = res.headers.get("content-type");
  const text = await res.text();
  let body: any = null;
  if (text && contentType?.includes("application/json")) body = JSON.parse(text);
  else body = text;
  return { status: res.status, body, contentType };
}

beforeAll(async () => {
  await db.insert(profilesTable).values([
    { id: owner, username: `ana-owner-${slug}`, displayName: "Ana Owner" },
    { id: stranger, username: `ana-str-${slug}`, displayName: "Ana Str" },
    { id: viewer1, username: `ana-v1-${slug}`, displayName: "Ana V1" },
    { id: viewer2, username: `ana-v2-${slug}`, displayName: "Ana V2" },
  ]);

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;

  const acct = await api("/ad-accounts", owner, {
    method: "POST",
    body: JSON.stringify({ name: `Ana Acct ${slug}` }),
  });
  accountId = acct.body.id;

  const [campaign] = await db
    .insert(adCampaignsTable)
    .values({ accountId, name: "Ana Campaign", status: "active" })
    .returning({ id: adCampaignsTable.id });
  const [adSet] = await db
    .insert(adSetsTable)
    .values({
      campaignId: campaign.id,
      accountId,
      name: "Ana Ad Set",
      status: "active",
    })
    .returning({ id: adSetsTable.id });
  const [ad] = await db
    .insert(adsTable)
    .values({
      adSetId: adSet.id,
      accountId,
      name: "Ana Ad",
      status: "active",
      reviewStatus: "approved",
    })
    .returning({ id: adsTable.id });
  adId = ad.id;

  // 3 impressions from 2 distinct viewers (reach=2), each costing IMPRESSION_COST.
  await db.insert(adImpressionsTable).values([
    { adId, accountId, viewerId: viewer1, costCents: IMPRESSION_COST },
    { adId, accountId, viewerId: viewer2, costCents: IMPRESSION_COST },
    { adId, accountId, viewerId: viewer1, costCents: IMPRESSION_COST },
  ]);
  // 1 click by viewer1 (enables last-click attribution).
  await db
    .insert(adClicksTable)
    .values({ adId, accountId, viewerId: viewer1, costCents: CLICK_COST });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [owner, stranger, viewer1, viewer2]));
  await pool.end();
});

describe("Task #5 — pixel token", () => {
  it("round-trips sign/verify and resolves the account id", () => {
    const token = signPixelToken(accountId);
    expect(token).toMatch(/^px_\d+_/);
    expect(verifyPixelToken(token)).toBe(accountId);
  });

  it("rejects a tampered or malformed token", () => {
    const token = signPixelToken(accountId);
    expect(verifyPixelToken(token + "x")).toBeNull();
    expect(verifyPixelToken(`px_${accountId}_deadbeef`)).toBeNull();
    expect(verifyPixelToken("garbage")).toBeNull();
    expect(verifyPixelToken("")).toBeNull();
  });
});

describe("Task #5 — insights aggregation", () => {
  it("aggregates impressions, reach, clicks, CTR and spend", async () => {
    const res = await api(`/ad-accounts/${accountId}/insights`, owner);
    expect(res.status).toBe(200);
    const s = res.body.summary;
    expect(s.impressions).toBe(3);
    expect(s.reach).toBe(2);
    expect(s.clicks).toBe(1);
    expect(s.spentCents).toBe(SEEDED_SPEND);
    expect(s.ctr).toBeCloseTo(1 / 3, 5);
    // CPC = spend / clicks
    expect(s.cpcCents).toBe(SEEDED_SPEND);
    // No conversions yet: cost-per-conversion is null (no divide-by-zero) and
    // ROAS is 0 (spend > 0 but no conversion value returned).
    expect(s.costPerResultCents).toBeNull();
    expect(s.roas).toBe(0);
    // Breakdown has the campaign with a resolved name.
    expect(res.body.breakdown.length).toBe(1);
    expect(res.body.breakdown[0].name).toBe("Ana Campaign");
    expect(res.body.breakdown[0].spentCents).toBe(SEEDED_SPEND);
  });

  it("reconciles reported spend with the seeded per-event cost_cents", async () => {
    const res = await api(`/ad-accounts/${accountId}/insights`, owner);
    // Spend reported by insights must equal the exact cents billed per event.
    expect(res.body.summary.spentCents).toBe(SEEDED_SPEND);
  });

  it("supports the adset breakdown level", async () => {
    const res = await api(
      `/ad-accounts/${accountId}/insights?level=adset`,
      owner,
    );
    expect(res.status).toBe(200);
    expect(res.body.level).toBe("adset");
    expect(res.body.breakdown[0].name).toBe("Ana Ad Set");
  });

  it("denies a stranger without account access", async () => {
    const res = await api(`/ad-accounts/${accountId}/insights`, stranger);
    expect(res.status).toBe(403);
  });
});

describe("Task #5 — pixel endpoint + conversion attribution", () => {
  it("returns a pixel token and embeddable snippet for the owner", async () => {
    const res = await api(`/ad-accounts/${accountId}/pixel`, owner);
    expect(res.status).toBe(200);
    expect(verifyPixelToken(res.body.token)).toBe(accountId);
    expect(res.body.snippet).toContain(res.body.token);
    expect(res.body.gifUrl).toContain("/api/ads/pixel.gif");
  });

  it("attributes an explicit adId when it belongs to the account", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "purchase",
        valueCents: 500,
        adId,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.body.attributed).toBe(true);
    expect(res.body.adId).toBe(adId);
  });

  it("last-click attributes a viewer who clicked, with no explicit adId", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "lead",
        valueCents: 0,
        viewerId: viewer1,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.body.attributed).toBe(true);
    expect(res.body.adId).toBe(adId);
  });

  it("records an unattributed conversion when the viewer never clicked", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "signup",
        viewerId: viewer2,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.body.attributed).toBe(false);
    expect(res.body.adId).toBeNull();
  });

  it("rejects an invalid pixel token", async () => {
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({ token: "px_1_bad", eventName: "purchase" }),
    });
    expect(res.status).toBe(400);
  });

  it("always serves the pixel.gif beacon", async () => {
    const token = signPixelToken(accountId);
    const good = await api(
      `/ads/pixel.gif?token=${encodeURIComponent(token)}&event=purchase&value=100&viewer=${viewer1}`,
      null,
    );
    expect(good.status).toBe(200);
    expect(good.contentType).toContain("image/gif");
    // Bad token still returns a gif (never leak validity to the browser).
    const bad = await api(`/ads/pixel.gif?token=nope`, null);
    expect(bad.status).toBe(200);
    expect(bad.contentType).toContain("image/gif");
  });

  it("lists recorded conversions for the account", async () => {
    const res = await api(`/ad-accounts/${accountId}/conversions`, owner);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const events = res.body.map((c: { eventName: string }) => c.eventName);
    expect(events).toContain("purchase");
    expect(events).toContain("lead");
    expect(events).toContain("signup");
  });

  it("exposes ROAS and cost-per-conversion once conversions exist", async () => {
    const res = await api(`/ad-accounts/${accountId}/insights`, owner);
    expect(res.status).toBe(200);
    const s = res.body.summary;
    // Conversions were recorded above, so both metrics are now populated.
    expect(s.conversions).toBeGreaterThan(0);
    expect(s.conversionValueCents).toBeGreaterThan(0);
    // ROAS = conversion value / spend (a positive ratio, spend > 0).
    expect(s.roas).toBeGreaterThan(0);
    expect(s.roas).toBeCloseTo(s.conversionValueCents / s.spentCents, 5);
    // Cost per conversion = spend / conversions (no longer null).
    expect(s.costPerResultCents).toBe(
      Math.round(s.spentCents / s.conversions),
    );
  });
});

// Task #14 — the pixel endpoints are public and unauthenticated, so they get
// hit with junk, replays and bursts. These lock the hardening: bad input never
// 500s the beacon, and conversion rows stay clean (clamped values, capped
// string lengths, size-limited metadata, rapid-duplicate suppression).
describe("Task #14 — conversion pixel hardening", () => {
  it("rejects a conversion with a missing eventName (400, not 500)", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({ token, valueCents: 100 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects malformed (non-object) metadata", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "bad_meta",
        metadata: "not-an-object",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("clamps an absurdly large valueCents instead of 500ing", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "big_value",
        valueCents: 5_000_000_000, // > int4 range
        viewerId: viewer2,
      }),
    });
    expect(res.status).toBe(200);

    const [row] = await db
      .select({ valueCents: adConversionsTable.valueCents })
      .from(adConversionsTable)
      .where(
        and(
          eq(adConversionsTable.accountId, accountId),
          eq(adConversionsTable.eventName, "big_value"),
        ),
      )
      .limit(1);
    // Clamped to the ceiling, well under the int4 column max (2147483647).
    expect(row.valueCents).toBe(1_000_000_000);
  });

  it("drops oversized metadata rather than storing megabytes (no 500)", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "big_meta_ok",
        viewerId: viewer2,
        metadata: { blob: "x".repeat(20000) },
      }),
    });
    expect(res.status).toBe(200);

    const [row] = await db
      .select({ metadata: adConversionsTable.metadata })
      .from(adConversionsTable)
      .where(
        and(
          eq(adConversionsTable.accountId, accountId),
          eq(adConversionsTable.eventName, "big_meta_ok"),
        ),
      )
      .limit(1);
    expect(row.metadata).toEqual({ _truncated: true });
  });

  it("records without a viewer when viewerId is malformed (no 500)", async () => {
    const token = signPixelToken(accountId);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "malformed_viewer",
        viewerId: "not-a-uuid",
      }),
    });
    expect(res.status).toBe(200);

    const [row] = await db
      .select({ viewerId: adConversionsTable.viewerId })
      .from(adConversionsTable)
      .where(
        and(
          eq(adConversionsTable.accountId, accountId),
          eq(adConversionsTable.eventName, "malformed_viewer"),
        ),
      )
      .limit(1);
    expect(row.viewerId).toBeNull();
  });

  it("records anonymously when the viewer UUID is unknown (FK fallback, no 500)", async () => {
    const token = signPixelToken(accountId);
    const unknownViewer = randomUUID();
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({
        token,
        eventName: "unknown_viewer",
        viewerId: unknownViewer,
      }),
    });
    expect(res.status).toBe(200);

    const [row] = await db
      .select({ viewerId: adConversionsTable.viewerId })
      .from(adConversionsTable)
      .where(
        and(
          eq(adConversionsTable.accountId, accountId),
          eq(adConversionsTable.eventName, "unknown_viewer"),
        ),
      )
      .limit(1);
    expect(row.viewerId).toBeNull();
  });

  it("suppresses rapid duplicate fires from the same viewer", async () => {
    const token = signPixelToken(accountId);
    const payload = JSON.stringify({
      token,
      eventName: "dedup_evt",
      valueCents: 777,
      viewerId: viewer1,
    });
    const first = await api(`/ads/pixel`, null, {
      method: "POST",
      body: payload,
    });
    const second = await api(`/ads/pixel`, null, {
      method: "POST",
      body: payload,
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    // Only one row is recorded despite two identical rapid fires.
    const found = await db
      .select({ id: adConversionsTable.id })
      .from(adConversionsTable)
      .where(
        and(
          eq(adConversionsTable.accountId, accountId),
          eq(adConversionsTable.eventName, "dedup_evt"),
        ),
      );
    expect(found.length).toBe(1);
  });

  it("caps an oversized eventName to keep rows clean", async () => {
    const token = signPixelToken(accountId);
    const longName = "n".repeat(500);
    const res = await api(`/ads/pixel`, null, {
      method: "POST",
      body: JSON.stringify({ token, eventName: longName, viewerId: viewer2 }),
    });
    // Zod caps eventName at 64 chars, so an oversized name is rejected cleanly.
    expect(res.status).toBe(400);
  });

  it("gif beacon returns a gif on junk / oversized query input", async () => {
    const token = signPixelToken(accountId);
    const res = await api(
      `/ads/pixel.gif?token=${encodeURIComponent(token)}` +
        `&event=${"e".repeat(500)}&value=not-a-number&viewer=not-a-uuid&ad=abc`,
      null,
    );
    expect(res.status).toBe(200);
    expect(res.contentType).toContain("image/gif");

    // The junk event is recorded (truncated) but never errors the beacon.
    const [row] = await db
      .select({
        eventName: adConversionsTable.eventName,
        valueCents: adConversionsTable.valueCents,
        viewerId: adConversionsTable.viewerId,
      })
      .from(adConversionsTable)
      .where(
        and(
          eq(adConversionsTable.accountId, accountId),
          eq(adConversionsTable.eventName, "e".repeat(64)),
        ),
      )
      .limit(1);
    expect(row).toBeDefined();
    expect(row.eventName.length).toBe(64);
    expect(row.valueCents).toBe(0);
    expect(row.viewerId).toBeNull();
  });
});
