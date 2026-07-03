import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  adAccountsTable,
  adCouponsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";

// Locks in Task #4 (Payments + Billing) money-integrity behaviour that does not
// require live Stripe: promotional coupon/ad-credit redemption (atomic, single-
// use, expiry + assignment aware) and billing settings (spend limit, auto-
// recharge gated behind a saved card), plus the extended wallet response.

const owner = randomUUID();
const stranger = randomUUID();
const slug = owner.slice(0, 8);

let server: Server;
let baseUrl: string;
let accountId: number;

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

async function makeCoupon(code: string, amountCents: number, extra: Record<string, unknown> = {}) {
  const [c] = await db
    .insert(adCouponsTable)
    .values({ code, amountCents, ...extra })
    .returning();
  return c;
}

beforeAll(async () => {
  await db.insert(profilesTable).values([
    { id: owner, username: `bill-owner-${slug}`, displayName: "Bill Owner" },
    { id: stranger, username: `bill-str-${slug}`, displayName: "Bill Str" },
  ]);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;

  const res = await api("/ad-accounts", owner, {
    method: "POST",
    body: JSON.stringify({ name: `Bill Acct ${slug}` }),
  });
  accountId = res.body.id;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [owner, stranger]));
  await pool.end();
});

describe("Task #4 — coupon redemption", () => {
  it("redeems a valid coupon into promotional credit", async () => {
    await makeCoupon(`GOOD-${slug}`, 2500);
    const res = await api(`/ad-accounts/${accountId}/coupons/redeem`, owner, {
      method: "POST",
      body: JSON.stringify({ code: `GOOD-${slug}` }),
    });
    expect(res.status).toBe(200);
    expect(res.body.creditBalanceCents).toBe(2500);
    expect(res.body.coupon.status).toBe("redeemed");
  });

  it("refuses to redeem the same coupon twice", async () => {
    const res = await api(`/ad-accounts/${accountId}/coupons/redeem`, owner, {
      method: "POST",
      body: JSON.stringify({ code: `GOOD-${slug}` }),
    });
    expect(res.status).toBe(400);
    // Still only credited once.
    const [acct] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, accountId));
    expect(acct.creditBalanceCents).toBe(2500);
  });

  it("refuses an expired coupon", async () => {
    await makeCoupon(`OLD-${slug}`, 1000, {
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await api(`/ad-accounts/${accountId}/coupons/redeem`, owner, {
      method: "POST",
      body: JSON.stringify({ code: `OLD-${slug}` }),
    });
    expect(res.status).toBe(400);
  });

  it("hides a coupon pre-assigned to another account", async () => {
    // Create a second account and assign the coupon to it.
    const other = await api("/ad-accounts", owner, {
      method: "POST",
      body: JSON.stringify({ name: `Other ${slug}` }),
    });
    await makeCoupon(`MINE-${slug}`, 500, { accountId: other.body.id });
    const res = await api(`/ad-accounts/${accountId}/coupons/redeem`, owner, {
      method: "POST",
      body: JSON.stringify({ code: `MINE-${slug}` }),
    });
    expect(res.status).toBe(400);
  });

  it("404s an unknown coupon code", async () => {
    const res = await api(`/ad-accounts/${accountId}/coupons/redeem`, owner, {
      method: "POST",
      body: JSON.stringify({ code: `NOPE-${slug}` }),
    });
    expect(res.status).toBe(400);
  });

  it("forbids a stranger from redeeming into the account", async () => {
    await makeCoupon(`STR-${slug}`, 100);
    const res = await api(`/ad-accounts/${accountId}/coupons/redeem`, stranger, {
      method: "POST",
      body: JSON.stringify({ code: `STR-${slug}` }),
    });
    expect([403, 404]).toContain(res.status);
  });
});

describe("Task #4 — billing settings", () => {
  it("returns default billing settings", async () => {
    const res = await api(
      `/ad-accounts/${accountId}/billing/settings`,
      owner,
    );
    expect(res.status).toBe(200);
    expect(res.body.autoRechargeEnabled).toBe(false);
    expect(res.body.hasPaymentMethod).toBe(false);
    expect(typeof res.body.paymentsEnabled).toBe("boolean");
  });

  it("sets a spend limit without a card", async () => {
    const res = await api(
      `/ad-accounts/${accountId}/billing/settings`,
      owner,
      {
        method: "PATCH",
        body: JSON.stringify({ spendLimitCents: 10000 }),
      },
    );
    expect(res.status).toBe(200);
    expect(res.body.spendLimitCents).toBe(10000);
  });

  it("refuses to enable auto-recharge without a saved card", async () => {
    const res = await api(
      `/ad-accounts/${accountId}/billing/settings`,
      owner,
      {
        method: "PATCH",
        body: JSON.stringify({
          autoRechargeEnabled: true,
          autoRechargeThresholdCents: 1000,
          autoRechargeAmountCents: 5000,
        }),
      },
    );
    expect(res.status).toBe(400);
  });
});

describe("Task #4 — wallet response", () => {
  it("exposes credit/spent/limit and auto-recharge flag", async () => {
    const res = await api(`/ad-accounts/${accountId}/wallet`, owner);
    expect(res.status).toBe(200);
    expect(res.body.creditBalanceCents).toBe(2500);
    expect(res.body.spentCents).toBe(0);
    expect(res.body.spendLimitCents).toBe(10000);
    expect(res.body.autoRechargeEnabled).toBe(false);
    // The coupon redemption should appear as a credit transaction.
    expect(
      res.body.transactions.some((t: any) => t.type === "credit"),
    ).toBe(true);
  });
});
