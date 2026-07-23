import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  pagesTable,
  shopCategoriesTable,
  shopLedgerTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";

const seller = randomUUID();
const buyer = randomUUID();
const admin = randomUUID();
const everyUser = [seller, buyer, admin];
let pageId: number;
let categoryId: number;
let server: Server;
let baseUrl: string;

async function api(path: string, asUser: string, init: RequestInit = {}) {
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
  await db.insert(profilesTable).values(
    everyUser.map((id) => ({
      id,
      username: `shopadm-${id.slice(0, 8)}`,
      displayName: "Shop Admin Test",
      role: (id === admin ? "admin" : "user") as "admin" | "user",
    })),
  );
  const [page] = await db
    .insert(pagesTable)
    .values({ name: "Direct Hub", createdBy: seller })
    .returning();
  pageId = page.id;
  const [category] = await db
    .insert(shopCategoriesTable)
    .values({ name: `Test Cat ${randomUUID().slice(0, 8)}`, icon: "🧪" })
    .returning();
  categoryId = category.id;
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.delete(profilesTable).where(inArray(profilesTable.id, everyUser));
  await db
    .delete(shopCategoriesTable)
    .where(eq(shopCategoriesTable.id, categoryId));
  await pool.end();
});

describe("shop admin + direct flow", () => {
  let productId: number;
  let orderId: number;

  it("full direct-payment flow with admin verify and completion credit", async () => {
    await api("/shop/stall", seller, {
      method: "POST",
      body: JSON.stringify({
        pageId,
        address: "Test Bazaar, Dhaka",
        productType: "physical",
        contactPhone: "01700000000",
      }),
    });
    let r = await api("/shop/products", seller, {
      method: "POST",
      body: JSON.stringify({
        name: "Gadget",
        priceCents: 50000,
        stockQty: 5,
        categoryId,
      }),
    });
    productId = r.body.id;

    // Direct order requires paymentRef
    r = await api("/shop/orders", buyer, {
      method: "POST",
      body: JSON.stringify({
        productId,
        quantity: 1,
        deliveryAddress: "a",
        phone: "1",
        paymentMethod: "direct",
      }),
    });
    expect(r.status).toBe(400);

    r = await api("/shop/orders", buyer, {
      method: "POST",
      body: JSON.stringify({
        productId,
        quantity: 1,
        deliveryAddress: "a",
        phone: "1",
        paymentMethod: "direct",
        paymentRef: "TXN123",
      }),
    });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("awaiting_verification");
    orderId = r.body.id;

    // Admin sees it in payments queue
    r = await api("/admin/shop/payments", admin);
    expect(r.status).toBe(200);
    expect(r.body.some((o: any) => o.id === orderId)).toBe(true);

    // Admin approves payment -> pending, held
    r = await api(`/admin/shop/orders/${orderId}/verify-payment`, admin, {
      method: "POST",
      body: JSON.stringify({ approve: true }),
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("pending");
    expect(r.body.heldCents).toBe(50000);

    // Seller -> confirmed -> delivered
    await api(`/shop/orders/${orderId}/status`, seller, {
      method: "POST",
      body: JSON.stringify({ status: "confirmed" }),
    });
    await api(`/shop/orders/${orderId}/status`, seller, {
      method: "POST",
      body: JSON.stringify({ status: "delivered" }),
    });
    // Buyer completes
    r = await api(`/shop/orders/${orderId}/status`, buyer, {
      method: "POST",
      body: JSON.stringify({ status: "completed" }),
    });
    expect(r.body.status).toBe("completed");

    // Wallet: direct credit = 50000 - 2500 = 47500
    const w = await api("/shop/wallet", seller);
    expect(w.body.balanceCents).toBe(47500);
    expect(w.body.ledger[0].kind).toBe("sale_credit");
  });

  it("withdrawal request debits, admin reject refunds", async () => {
    let r = await api("/shop/withdrawals", seller, {
      method: "POST",
      body: JSON.stringify({
        amountCents: 40000,
        method: "bkash",
        details: { phone: "017" },
      }),
    });
    expect(r.status).toBe(201);
    const wid = r.body.id;
    let w = await api("/shop/wallet", seller);
    expect(w.body.balanceCents).toBe(7500);
    expect(w.body.pendingWithdrawCents).toBe(40000);

    // Over-balance withdrawal rejected
    r = await api("/shop/withdrawals", seller, {
      method: "POST",
      body: JSON.stringify({
        amountCents: 999999,
        method: "bkash",
        details: {},
      }),
    });
    expect(r.status).toBe(400);

    // Admin rejects -> refund
    r = await api(`/admin/shop/withdrawals/${wid}`, admin, {
      method: "POST",
      body: JSON.stringify({ approve: false, note: "no" }),
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("rejected");
    w = await api("/shop/wallet", seller);
    expect(w.body.balanceCents).toBe(47500);
  });

  it("admin summary reports profit and counts", async () => {
    const r = await api("/admin/shop/summary", admin);
    expect(r.status).toBe(200);
    // direct commission was 2500
    expect(r.body.platformProfitCents).toBeGreaterThanOrEqual(2500);
    expect(r.body.stallCount).toBeGreaterThanOrEqual(1);
  });

  it("admin can patch settings", async () => {
    const r = await api("/admin/shop/settings", admin, {
      method: "PATCH",
      body: JSON.stringify({ commissionPercent: 7, paymentInstructions: "bKash 017" }),
    });
    expect(r.status).toBe(200);
    expect(r.body.commissionPercent).toBe(7);
    // reset
    await api("/admin/shop/settings", admin, {
      method: "PATCH",
      body: JSON.stringify({ commissionPercent: 5, paymentInstructions: "" }),
    });
  });
});
