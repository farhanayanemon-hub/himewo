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
  shopCategoriesTable,
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
let categoryId: number;
let server: Server;
let baseUrl: string;

const stallBody = (pid: number) => ({
  pageId: pid,
  address: "Test Bazaar, Dhaka",
  productType: "physical",
  contactPhone: "01700000000",
});

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

describe("shop backend smoke", () => {
  let productId: number;
  let orderId: number;

  it("blocks opening a stall for a Hub you don't manage", async () => {
    const r = await api("/shop/stall", other, {
      method: "POST",
      body: JSON.stringify(stallBody(pageId)),
    });
    expect(r.status).toBe(403);
  });

  it("opens a stall for a Hub you manage, name = page name", async () => {
    const r = await api("/shop/stall", seller, {
      method: "POST",
      body: JSON.stringify(stallBody(pageId)),
    });
    expect(r.status).toBe(201);
    expect(r.body.name).toBe("Seller Hub");
    expect(r.body.isOwner).toBe(true);
  });

  it("rejects a second stall (409)", async () => {
    const r = await api("/shop/stall", seller, {
      method: "POST",
      body: JSON.stringify(stallBody(pageId)),
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
        categoryId,
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

  it("blocks reviews from non-buyers and on non-completed orders", async () => {
    // Non-buyer (other) cannot review
    let r = await api(`/shop/orders/${orderId}/review`, other, {
      method: "POST",
      body: JSON.stringify({ rating: 5 }),
    });
    expect(r.status).toBe(403);
    // Seller cannot review either
    r = await api(`/shop/orders/${orderId}/review`, seller, {
      method: "POST",
      body: JSON.stringify({ rating: 5 }),
    });
    expect(r.status).toBe(403);
    // A fresh pending order cannot be reviewed
    const pendingOrder = await api("/shop/orders", buyer, {
      method: "POST",
      body: JSON.stringify({
        productId,
        quantity: 1,
        deliveryAddress: "123 St",
        phone: "0170000",
        paymentMethod: "cod",
      }),
    });
    expect(pendingOrder.status).toBe(201);
    r = await api(`/shop/orders/${pendingOrder.body.id}/review`, buyer, {
      method: "POST",
      body: JSON.stringify({ rating: 5 }),
    });
    expect(r.status).toBe(400);
  });

  it("rejects an out-of-range rating", async () => {
    const r = await api(`/shop/orders/${orderId}/review`, buyer, {
      method: "POST",
      body: JSON.stringify({ rating: 6 }),
    });
    expect(r.status).toBe(400);
  });

  it("lets the buyer review a completed order once", async () => {
    let r = await api(`/shop/orders/${orderId}/review`, buyer, {
      method: "POST",
      body: JSON.stringify({ rating: 4, body: "Solid widget" }),
    });
    expect(r.status).toBe(201);
    expect(r.body.rating).toBe(4);
    expect(r.body.body).toBe("Solid widget");
    expect(r.body.reviewer?.id).toBe(buyer);

    // Second review on the same order -> 409
    r = await api(`/shop/orders/${orderId}/review`, buyer, {
      method: "POST",
      body: JSON.stringify({ rating: 5 }),
    });
    expect(r.status).toBe(409);
  });

  it("exposes aggregates on product, product reviews, order, and stall", async () => {
    const p = await api(`/shop/products/${productId}`, buyer);
    expect(p.body.ratingAvg).toBe(4);
    expect(p.body.ratingCount).toBe(1);

    const rev = await api(`/shop/products/${productId}/reviews`, buyer);
    expect(rev.status).toBe(200);
    expect(rev.body.ratingAvg).toBe(4);
    expect(rev.body.ratingCount).toBe(1);
    expect(rev.body.reviews.length).toBe(1);

    const orders = await api("/shop/orders?role=buyer", buyer);
    const mine = orders.body.find((o: any) => o.id === orderId);
    expect(mine.myReviewRating).toBe(4);

    const [orderRow] = await db
      .select({ stallId: shopOrdersTable.stallId })
      .from(shopOrdersTable)
      .where(eq(shopOrdersTable.id, orderId));
    const s = await api(`/shop/stalls/${orderRow.stallId}`, buyer);
    expect(s.body.ratingAvg).toBe(4);
    expect(s.body.ratingCount).toBe(1);
  });
});
