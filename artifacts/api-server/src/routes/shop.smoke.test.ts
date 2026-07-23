import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  pagesTable,
  shopStallsTable,
  shopLedgerTable,
  shopOrdersTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";

const seller = randomUUID();
const buyer = randomUUID();
const other = randomUUID();
const everyUser = [seller, buyer, other];
let pageId: number;
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
  await db.insert(profilesTable).values(
    everyUser.map((id) => ({
      id,
      username: `shop-${id.slice(0, 8)}`,
      displayName: "Shop Test User",
    })),
  );
  const [page] = await db
    .insert(pagesTable)
    .values({ name: "Seller Hub", createdBy: seller })
    .returning();
  pageId = page.id;
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.delete(profilesTable).where(inArray(profilesTable.id, everyUser));
  await pool.end();
});

describe("shop backend smoke", () => {
  let productId: number;
  let orderId: number;

  it("blocks opening a stall for a Hub you don't manage", async () => {
    const r = await api("/shop/stall", other, {
      method: "POST",
      body: JSON.stringify({ pageId }),
    });
    expect(r.status).toBe(403);
  });

  it("opens a stall for a Hub you manage, name = page name", async () => {
    const r = await api("/shop/stall", seller, {
      method: "POST",
      body: JSON.stringify({ pageId }),
    });
    expect(r.status).toBe(201);
    expect(r.body.name).toBe("Seller Hub");
    expect(r.body.isOwner).toBe(true);
  });

  it("rejects a second stall (409)", async () => {
    const r = await api("/shop/stall", seller, {
      method: "POST",
      body: JSON.stringify({ pageId }),
    });
    expect(r.status).toBe(409);
  });

  it("creates a product", async () => {
    const r = await api("/shop/products", seller, {
      method: "POST",
      body: JSON.stringify({
        name: "Widget",
        priceCents: 10000,
        description: "A widget",
        stockQty: 3,
        photos: ["p.jpg"],
      }),
    });
    expect(r.status).toBe(201);
    productId = r.body.id;
    expect(r.body.priceCents).toBe(10000);
  });

  it("blocks ordering from your own stall", async () => {
    const r = await api("/shop/orders", seller, {
      method: "POST",
      body: JSON.stringify({
        productId,
        quantity: 1,
        deliveryAddress: "x",
        phone: "0170",
        paymentMethod: "cod",
      }),
    });
    expect(r.status).toBe(403);
  });

  it("places a COD order (pending) and decrements stock", async () => {
    const r = await api("/shop/orders", buyer, {
      method: "POST",
      body: JSON.stringify({
        productId,
        quantity: 2,
        deliveryAddress: "123 St",
        phone: "0170000",
        paymentMethod: "cod",
      }),
    });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("pending");
    expect(r.body.totalCents).toBe(20000);
    orderId = r.body.id;
    const p = await api(`/shop/products/${productId}`, buyer);
    expect(p.body.stockQty).toBe(1);
  });

  it("enforces stock limit", async () => {
    const r = await api("/shop/orders", buyer, {
      method: "POST",
      body: JSON.stringify({
        productId,
        quantity: 5,
        deliveryAddress: "123 St",
        phone: "0170000",
        paymentMethod: "cod",
      }),
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/stock/i);
  });

  it("runs seller -> buyer transitions to completion (COD debits commission)", async () => {
    // Buyer cannot confirm before delivered
    let r = await api(`/shop/orders/${orderId}/status`, buyer, {
      method: "POST",
      body: JSON.stringify({ status: "completed" }),
    });
    expect(r.status).toBe(400);

    // Seller: pending -> confirmed
    r = await api(`/shop/orders/${orderId}/status`, seller, {
      method: "POST",
      body: JSON.stringify({ status: "confirmed" }),
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("confirmed");

    // Seller: confirmed -> delivered
    r = await api(`/shop/orders/${orderId}/status`, seller, {
      method: "POST",
      body: JSON.stringify({ status: "delivered" }),
    });
    expect(r.body.status).toBe("delivered");

    // Buyer: delivered -> completed
    r = await api(`/shop/orders/${orderId}/status`, buyer, {
      method: "POST",
      body: JSON.stringify({ status: "completed" }),
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("completed");

    // Wallet: COD completion debits commission (5% of 20000 = 1000 -> -1000)
    const w = await api("/shop/wallet", seller);
    expect(w.status).toBe(200);
    expect(w.body.balanceCents).toBe(-1000);
    expect(w.body.ledger[0].kind).toBe("cod_commission");
  });

  it("is idempotent on double-confirm (no double debit)", async () => {
    const r = await api(`/shop/orders/${orderId}/status`, buyer, {
      method: "POST",
      body: JSON.stringify({ status: "completed" }),
    });
    expect(r.status).toBe(400);
    const rows = await db
      .select()
      .from(shopLedgerTable)
      .where(eq(shopLedgerTable.orderId, orderId));
    expect(rows.length).toBe(1);
  });

  it("exposes public settings", async () => {
    const r = await api("/shop/settings", buyer);
    expect(r.status).toBe(200);
    expect(r.body.commissionPercent).toBe(5);
  });
});
