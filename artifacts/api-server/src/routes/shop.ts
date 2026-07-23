import { Router, type IRouter } from "express";
import {
  db,
  shopStallsTable,
  shopProductsTable,
  shopOrdersTable,
  shopLedgerTable,
  shopWithdrawalsTable,
  pagesTable,
  profilesTable,
  type ShopStall,
  type ShopProduct,
  type ShopOrder,
} from "@workspace/db";
import { and, eq, lt, desc, ilike, count, gt, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { canManagePage } from "../lib/authz";
import { toProfile } from "../lib/serialize";
import { createNotification } from "../lib/notify";
import { getShopSettings, commissionFor } from "../lib/shop";
import {
  GetShopSettingsResponse,
  GetMyStallResponse,
  CreateStallBody,
  CreateStallResponse,
  BrowseStallsQueryParams,
  BrowseStallsResponse,
  GetStallParams,
  GetStallResponse,
  GetStallProductsParams,
  GetStallProductsQueryParams,
  GetStallProductsResponse,
  BrowseProductsQueryParams,
  BrowseProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  ListOrdersQueryParams,
  ListOrdersResponse,
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
  GetShopWalletResponse,
  ListShopWithdrawalsResponse,
  CreateShopWithdrawalBody,
  CreateShopWithdrawalResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

type PageRef = { name: string; avatarUrl: string | null };

async function loadPageRefs(ids: number[]): Promise<Map<number, PageRef>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: pagesTable.id,
      name: pagesTable.name,
      avatarUrl: pagesTable.avatarUrl,
    })
    .from(pagesTable)
    .where(inArray(pagesTable.id, unique));
  return new Map(rows.map((r) => [r.id, { name: r.name, avatarUrl: r.avatarUrl }]));
}

function toStallDto(
  stall: ShopStall,
  page: PageRef | undefined,
  viewerId: string,
  productCount?: number,
) {
  return {
    id: stall.id,
    userId: stall.userId,
    pageId: stall.pageId,
    name: page?.name ?? "Stall",
    avatarUrl: page?.avatarUrl ?? null,
    active: stall.active,
    productCount,
    isOwner: stall.userId === viewerId,
    createdAt: stall.createdAt,
  };
}

function toProductDto(product: ShopProduct, stallName?: string | null) {
  return {
    id: product.id,
    stallId: product.stallId,
    stallName: stallName ?? null,
    photos: product.photos,
    name: product.name,
    priceCents: product.priceCents,
    description: product.description,
    stockQty: product.stockQty,
    active: product.active,
    createdAt: product.createdAt,
  };
}

async function toOrderDto(
  order: ShopOrder,
  opts: {
    stallName?: string | null;
    productPhoto?: string | null;
    counterpart?: ReturnType<typeof toProfile> | null;
  } = {},
) {
  return {
    id: order.id,
    productId: order.productId,
    stallId: order.stallId,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    quantity: order.quantity,
    unitPriceCents: order.unitPriceCents,
    totalCents: order.totalCents,
    productName: order.productName,
    productPhoto: opts.productPhoto ?? null,
    stallName: opts.stallName ?? null,
    deliveryAddress: order.deliveryAddress,
    phone: order.phone,
    paymentMethod: order.paymentMethod,
    paymentRef: order.paymentRef,
    heldCents: order.heldCents,
    status: order.status,
    createdAt: order.createdAt,
    counterpart: opts.counterpart ?? null,
  };
}

/** Attach product photo, stall name, and counterpart profile to a list of orders. */
async function enrichOrders(orders: ShopOrder[], viewerId: string) {
  if (orders.length === 0) return [];
  const productIds = [...new Set(orders.map((o) => o.productId))];
  const stallIds = [...new Set(orders.map((o) => o.stallId))];
  const [products, stalls] = await Promise.all([
    db
      .select({ id: shopProductsTable.id, photos: shopProductsTable.photos })
      .from(shopProductsTable)
      .where(inArray(shopProductsTable.id, productIds)),
    db
      .select({ id: shopStallsTable.id, pageId: shopStallsTable.pageId })
      .from(shopStallsTable)
      .where(inArray(shopStallsTable.id, stallIds)),
  ]);
  const photoByProduct = new Map(
    products.map((p) => [p.id, p.photos[0] ?? null]),
  );
  const pageIdByStall = new Map(stalls.map((s) => [s.id, s.pageId]));
  const pageRefs = await loadPageRefs([...pageIdByStall.values()]);
  // Counterpart = the "other party" from the viewer's perspective.
  const counterpartIds = [
    ...new Set(
      orders.map((o) => (o.buyerId === viewerId ? o.sellerId : o.buyerId)),
    ),
  ];
  const profileRows = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, counterpartIds));
  const profileMap = new Map(profileRows.map((p) => [p.id, toProfile(p)]));
  return Promise.all(
    orders.map((o) => {
      const pageId = pageIdByStall.get(o.stallId);
      const stallName = pageId != null ? (pageRefs.get(pageId)?.name ?? null) : null;
      const counterId = o.buyerId === viewerId ? o.sellerId : o.buyerId;
      return toOrderDto(o, {
        stallName,
        productPhoto: photoByProduct.get(o.productId) ?? null,
        counterpart: profileMap.get(counterId) ?? null,
      });
    }),
  );
}

async function loadMyStall(userId: string): Promise<ShopStall | undefined> {
  const [stall] = await db
    .select()
    .from(shopStallsTable)
    .where(eq(shopStallsTable.userId, userId));
  return stall;
}

async function walletBalanceCents(sellerId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${shopLedgerTable.amountCents}), 0)::int`,
    })
    .from(shopLedgerTable)
    .where(eq(shopLedgerTable.sellerId, sellerId));
  return row?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

router.get("/shop/settings", requireAuth, async (_req, res): Promise<void> => {
  const settings = await getShopSettings();
  res.json(GetShopSettingsResponse.parse(settings));
});

// ---------------------------------------------------------------------------
// Stall
// ---------------------------------------------------------------------------

router.get("/shop/stall", requireAuth, async (req, res): Promise<void> => {
  const stall = await loadMyStall(req.userId!);
  if (!stall) {
    res.status(404).json({ error: "Stall not found" });
    return;
  }
  const pageRefs = await loadPageRefs([stall.pageId]);
  const [productCount] = await db
    .select({ value: count() })
    .from(shopProductsTable)
    .where(eq(shopProductsTable.stallId, stall.id));
  res.json(
    GetMyStallResponse.parse(
      toStallDto(stall, pageRefs.get(stall.pageId), req.userId!, productCount?.value ?? 0),
    ),
  );
});

router.post("/shop/stall", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStallBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.userId!;
  const { pageId } = parsed.data;
  const [page] = await db
    .select({ id: pagesTable.id })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId));
  if (!page) {
    res.status(400).json({ error: "You need a Hub to open a stall" });
    return;
  }
  if (!(await canManagePage(userId, pageId))) {
    res.status(403).json({ error: "You can only open a stall for a Hub you manage" });
    return;
  }
  // One stall per user AND one per page.
  const existing = await db
    .select({ id: shopStallsTable.id })
    .from(shopStallsTable)
    .where(
      sql`${shopStallsTable.userId} = ${userId} or ${shopStallsTable.pageId} = ${pageId}`,
    );
  if (existing.length > 0) {
    res.status(409).json({ error: "You already have a stall for this Hub" });
    return;
  }
  let stall: ShopStall;
  try {
    [stall] = await db
      .insert(shopStallsTable)
      .values({ userId, pageId })
      .returning();
  } catch {
    res.status(409).json({ error: "You already have a stall for this Hub" });
    return;
  }
  const pageRefs = await loadPageRefs([stall.pageId]);
  res
    .status(201)
    .json(
      CreateStallResponse.parse(
        toStallDto(stall, pageRefs.get(stall.pageId), userId, 0),
      ),
    );
});

router.get("/shop/stalls", requireAuth, async (req, res): Promise<void> => {
  const query = BrowseStallsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { cursor, limit } = query.data;
  const rows = await db
    .select()
    .from(shopStallsTable)
    .where(
      and(
        eq(shopStallsTable.active, true),
        cursor ? lt(shopStallsTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(shopStallsTable.id))
    .limit(limit ?? 20);
  const pageRefs = await loadPageRefs(rows.map((r) => r.pageId));
  res.json(
    BrowseStallsResponse.parse(
      rows.map((s) => toStallDto(s, pageRefs.get(s.pageId), req.userId!)),
    ),
  );
});

router.get("/shop/stalls/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetStallParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [stall] = await db
    .select()
    .from(shopStallsTable)
    .where(eq(shopStallsTable.id, params.data.id));
  if (!stall) {
    res.status(404).json({ error: "Stall not found" });
    return;
  }
  const pageRefs = await loadPageRefs([stall.pageId]);
  const [productCount] = await db
    .select({ value: count() })
    .from(shopProductsTable)
    .where(
      and(
        eq(shopProductsTable.stallId, stall.id),
        eq(shopProductsTable.active, true),
      ),
    );
  res.json(
    GetStallResponse.parse(
      toStallDto(stall, pageRefs.get(stall.pageId), req.userId!, productCount?.value ?? 0),
    ),
  );
});

router.get(
  "/shop/stalls/:id/products",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetStallProductsParams.safeParse(req.params);
    const query = GetStallProductsQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [stall] = await db
      .select()
      .from(shopStallsTable)
      .where(eq(shopStallsTable.id, params.data.id));
    if (!stall) {
      res.status(404).json({ error: "Stall not found" });
      return;
    }
    const isOwner = stall.userId === req.userId;
    const { cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(shopProductsTable)
      .where(
        and(
          eq(shopProductsTable.stallId, stall.id),
          isOwner ? undefined : eq(shopProductsTable.active, true),
          cursor ? lt(shopProductsTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(shopProductsTable.id))
      .limit(limit ?? 30);
    const pageRefs = await loadPageRefs([stall.pageId]);
    const stallName = pageRefs.get(stall.pageId)?.name ?? null;
    res.json(
      GetStallProductsResponse.parse(
        rows.map((p) => toProductDto(p, stallName)),
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

router.get("/shop/products", requireAuth, async (req, res): Promise<void> => {
  const query = BrowseProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { search, cursor, limit } = query.data;
  const rows = await db
    .select()
    .from(shopProductsTable)
    .where(
      and(
        eq(shopProductsTable.active, true),
        gt(shopProductsTable.stockQty, 0),
        search ? ilike(shopProductsTable.name, `%${search}%`) : undefined,
        cursor ? lt(shopProductsTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(shopProductsTable.id))
    .limit(limit ?? 20);
  const stallIds = [...new Set(rows.map((r) => r.stallId))];
  const stalls = stallIds.length
    ? await db
        .select({ id: shopStallsTable.id, pageId: shopStallsTable.pageId })
        .from(shopStallsTable)
        .where(inArray(shopStallsTable.id, stallIds))
    : [];
  const pageIdByStall = new Map(stalls.map((s) => [s.id, s.pageId]));
  const pageRefs = await loadPageRefs([...pageIdByStall.values()]);
  res.json(
    BrowseProductsResponse.parse(
      rows.map((p) => {
        const pageId = pageIdByStall.get(p.stallId);
        const stallName = pageId != null ? (pageRefs.get(pageId)?.name ?? null) : null;
        return toProductDto(p, stallName);
      }),
    ),
  );
});

router.post("/shop/products", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const stall = await loadMyStall(req.userId!);
  if (!stall) {
    res.status(403).json({ error: "You need a Hub to open a stall" });
    return;
  }
  const [product] = await db
    .insert(shopProductsTable)
    .values({
      stallId: stall.id,
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      description: parsed.data.description ?? "",
      stockQty: parsed.data.stockQty ?? 0,
      photos: parsed.data.photos ?? [],
    })
    .returning();
  const pageRefs = await loadPageRefs([stall.pageId]);
  res
    .status(201)
    .json(
      CreateProductResponse.parse(
        toProductDto(product, pageRefs.get(stall.pageId)?.name ?? null),
      ),
    );
});

router.get("/shop/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db
    .select()
    .from(shopProductsTable)
    .where(eq(shopProductsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [stall] = await db
    .select({ pageId: shopStallsTable.pageId })
    .from(shopStallsTable)
    .where(eq(shopStallsTable.id, product.stallId));
  const pageRefs = stall ? await loadPageRefs([stall.pageId]) : new Map();
  const stallName = stall ? (pageRefs.get(stall.pageId)?.name ?? null) : null;
  res.json(GetProductResponse.parse(toProductDto(product, stallName)));
});

router.patch(
  "/shop/products/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(req.params);
    const body = UpdateProductBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [product] = await db
      .select()
      .from(shopProductsTable)
      .where(eq(shopProductsTable.id, params.data.id));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const stall = await loadMyStall(req.userId!);
    if (!stall || stall.id !== product.stallId) {
      res.status(403).json({ error: "Not your product" });
      return;
    }
    const d = body.data;
    await db
      .update(shopProductsTable)
      .set({
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.priceCents !== undefined ? { priceCents: d.priceCents } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.stockQty !== undefined ? { stockQty: d.stockQty } : {}),
        ...(d.active !== undefined ? { active: d.active } : {}),
        ...(d.photos !== undefined ? { photos: d.photos } : {}),
      })
      .where(eq(shopProductsTable.id, product.id));
    const [updated] = await db
      .select()
      .from(shopProductsTable)
      .where(eq(shopProductsTable.id, product.id));
    const pageRefs = await loadPageRefs([stall.pageId]);
    res.json(
      UpdateProductResponse.parse(
        toProductDto(updated, pageRefs.get(stall.pageId)?.name ?? null),
      ),
    );
  },
);

router.delete(
  "/shop/products/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [product] = await db
      .select()
      .from(shopProductsTable)
      .where(eq(shopProductsTable.id, params.data.id));
    if (!product) {
      res.sendStatus(204);
      return;
    }
    const stall = await loadMyStall(req.userId!);
    if (!stall || stall.id !== product.stallId) {
      res.status(403).json({ error: "Not your product" });
      return;
    }
    const [orderCount] = await db
      .select({ value: count() })
      .from(shopOrdersTable)
      .where(eq(shopOrdersTable.productId, product.id));
    if ((orderCount?.value ?? 0) > 0) {
      // Soft-delete: keep the row so historical orders stay intact.
      await db
        .update(shopProductsTable)
        .set({ active: false })
        .where(eq(shopProductsTable.id, product.id));
    } else {
      await db
        .delete(shopProductsTable)
        .where(eq(shopProductsTable.id, product.id));
    }
    res.sendStatus(204);
  },
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

router.get("/shop/orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { role, cursor, limit } = query.data;
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(shopOrdersTable)
    .where(
      and(
        role === "buyer"
          ? eq(shopOrdersTable.buyerId, userId)
          : eq(shopOrdersTable.sellerId, userId),
        cursor ? lt(shopOrdersTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(shopOrdersTable.id))
    .limit(limit ?? 20);
  const enriched = await enrichOrders(rows, userId);
  res.json(ListOrdersResponse.parse(enriched));
});

router.post("/shop/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const buyerId = req.userId!;
  const { productId, quantity, deliveryAddress, phone, paymentMethod, paymentRef } =
    parsed.data;
  if (paymentMethod === "direct" && !paymentRef) {
    res.status(400).json({ error: "Payment reference is required for direct payment" });
    return;
  }
  const [product] = await db
    .select()
    .from(shopProductsTable)
    .where(eq(shopProductsTable.id, productId));
  if (!product || !product.active) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [stall] = await db
    .select()
    .from(shopStallsTable)
    .where(eq(shopStallsTable.id, product.stallId));
  if (!stall) {
    res.status(404).json({ error: "Stall not found" });
    return;
  }
  if (stall.userId === buyerId) {
    res.status(403).json({ error: "You cannot order from your own stall" });
    return;
  }

  const unitPriceCents = product.priceCents;
  const totalCents = unitPriceCents * quantity;
  const status = paymentMethod === "direct" ? "awaiting_verification" : "pending";

  const created = await db.transaction(async (tx) => {
    // Atomically decrement stock only if enough remains.
    const dec = await tx
      .update(shopProductsTable)
      .set({ stockQty: sql`${shopProductsTable.stockQty} - ${quantity}` })
      .where(
        and(
          eq(shopProductsTable.id, product.id),
          sql`${shopProductsTable.stockQty} >= ${quantity}`,
        ),
      )
      .returning({ id: shopProductsTable.id });
    if (dec.length === 0) return null;
    const [order] = await tx
      .insert(shopOrdersTable)
      .values({
        productId: product.id,
        stallId: stall.id,
        sellerId: stall.userId,
        buyerId,
        quantity,
        unitPriceCents,
        totalCents,
        productName: product.name,
        deliveryAddress,
        phone,
        paymentMethod,
        paymentRef: paymentMethod === "direct" ? (paymentRef ?? null) : null,
        status,
      })
      .returning();
    return order;
  });
  if (!created) {
    res.status(400).json({ error: "Not enough stock" });
    return;
  }

  // Notify the seller of the new order.
  await createNotification({
    userId: stall.userId,
    actorId: buyerId,
    type: "shop_order",
    entityType: "shop_order",
    entityId: created.id,
  });

  const [enriched] = await enrichOrders([created], buyerId);
  res.status(201).json(CreateOrderResponse.parse(enriched));
});

router.get("/shop/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db
    .select()
    .from(shopOrdersTable)
    .where(eq(shopOrdersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.buyerId !== req.userId && order.sellerId !== req.userId) {
    res.status(403).json({ error: "Not your order" });
    return;
  }
  const [enriched] = await enrichOrders([order], req.userId!);
  res.json(GetOrderResponse.parse(enriched));
});

// Allowed non-completion transitions keyed by "role:from->to".
router.post(
  "/shop/orders/:id/status",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateOrderStatusParams.safeParse(req.params);
    const body = UpdateOrderStatusBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const userId = req.userId!;
    const target = body.data.status;
    const [order] = await db
      .select()
      .from(shopOrdersTable)
      .where(eq(shopOrdersTable.id, params.data.id));
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const isSeller = order.sellerId === userId;
    const isBuyer = order.buyerId === userId;
    if (!isSeller && !isBuyer) {
      res.status(403).json({ error: "Not your order" });
      return;
    }

    const from = order.status;

    // Determine whether this actor may perform from->target.
    const sellerAllowed =
      (from === "pending" && target === "confirmed") ||
      (from === "confirmed" && target === "delivered") ||
      (from === "pending" && target === "cancelled");
    const buyerAllowed =
      (from === "delivered" && target === "completed") ||
      ((from === "awaiting_verification" || from === "pending") &&
        target === "cancelled");

    if (!(isSeller && sellerAllowed) && !(isBuyer && buyerAllowed)) {
      res.status(400).json({ error: "That status change is not allowed" });
      return;
    }

    // Completion (buyer confirms received): accrue commission idempotently.
    if (target === "completed") {
      await completeOrder(order.id, res);
      return;
    }

    // Cancellation: restore stock (guard against double-restore via status).
    if (target === "cancelled") {
      const updated = await db.transaction(async (tx) => {
        const done = await tx
          .update(shopOrdersTable)
          .set({ status: "cancelled" })
          .where(
            and(
              eq(shopOrdersTable.id, order.id),
              eq(shopOrdersTable.status, from),
            ),
          )
          .returning();
        if (done.length === 0) return null;
        await tx
          .update(shopProductsTable)
          .set({
            stockQty: sql`${shopProductsTable.stockQty} + ${order.quantity}`,
          })
          .where(eq(shopProductsTable.id, order.productId));
        return done[0];
      });
      if (!updated) {
        res.status(400).json({ error: "That status change is not allowed" });
        return;
      }
      // Notify the counterpart.
      await createNotification({
        userId: isBuyer ? order.sellerId : order.buyerId,
        actorId: userId,
        type: "shop_order",
        entityType: "shop_order",
        entityId: order.id,
      });
      const [enriched] = await enrichOrders([updated], userId);
      res.json(UpdateOrderStatusResponse.parse(enriched));
      return;
    }

    // Simple forward transition (confirmed/delivered).
    const done = await db
      .update(shopOrdersTable)
      .set({ status: target })
      .where(
        and(eq(shopOrdersTable.id, order.id), eq(shopOrdersTable.status, from)),
      )
      .returning();
    if (done.length === 0) {
      res.status(400).json({ error: "That status change is not allowed" });
      return;
    }
    // Notify the buyer of the seller's status change.
    await createNotification({
      userId: order.buyerId,
      actorId: userId,
      type: "shop_order",
      entityType: "shop_order",
      entityId: order.id,
    });
    const [enriched] = await enrichOrders([done[0]], userId);
    res.json(UpdateOrderStatusResponse.parse(enriched));
  },
);

/**
 * Complete a delivered order (buyer confirms received). Accrues commission
 * inside ONE transaction with a status-guarded UPDATE ... WHERE status =
 * 'delivered' RETURNING so a double-confirm cannot double-credit. The unique
 * (orderId, kind) ledger index is a second line of defence.
 */
async function completeOrder(orderId: number, res: import("express").Response) {
  const settings = await getShopSettings();
  const result = await db.transaction(async (tx) => {
    const done = await tx
      .update(shopOrdersTable)
      .set({ status: "completed", heldCents: 0 })
      .where(
        and(
          eq(shopOrdersTable.id, orderId),
          eq(shopOrdersTable.status, "delivered"),
        ),
      )
      .returning();
    if (done.length === 0) return null;
    const order = done[0];
    const commission = commissionFor(order.totalCents, settings.commissionPercent);
    if (order.paymentMethod === "direct") {
      // Credit seller net of commission.
      await tx.insert(shopLedgerTable).values({
        stallId: order.stallId,
        sellerId: order.sellerId,
        orderId: order.id,
        kind: "sale_credit",
        amountCents: order.totalCents - commission,
        note: `Sale #${order.id} (net of ${settings.commissionPercent}% commission)`,
      });
    } else {
      // COD: debit the seller the commission (balance may go negative).
      await tx.insert(shopLedgerTable).values({
        stallId: order.stallId,
        sellerId: order.sellerId,
        orderId: order.id,
        kind: "cod_commission",
        amountCents: -commission,
        note: `COD commission for sale #${order.id} (${settings.commissionPercent}%)`,
      });
    }
    return order;
  });
  if (!result) {
    res.status(400).json({ error: "That status change is not allowed" });
    return;
  }
  // Notify the seller of the completion credit.
  await createNotification({
    userId: result.sellerId,
    actorId: result.buyerId,
    type: "shop_order",
    entityType: "shop_order",
    entityId: result.id,
  });
  const [enriched] = await enrichOrders([result], result.buyerId);
  res.json(UpdateOrderStatusResponse.parse(enriched));
}

// ---------------------------------------------------------------------------
// Wallet & withdrawals
// ---------------------------------------------------------------------------

router.get("/shop/wallet", requireAuth, async (req, res): Promise<void> => {
  const stall = await loadMyStall(req.userId!);
  if (!stall) {
    res.status(404).json({ error: "Stall not found" });
    return;
  }
  const sellerId = req.userId!;
  const balanceCents = await walletBalanceCents(sellerId);
  const [pending] = await db
    .select({
      total: sql<number>`coalesce(sum(${shopWithdrawalsTable.amountCents}), 0)::int`,
    })
    .from(shopWithdrawalsTable)
    .where(
      and(
        eq(shopWithdrawalsTable.sellerId, sellerId),
        eq(shopWithdrawalsTable.status, "pending"),
      ),
    );
  const ledger = await db
    .select()
    .from(shopLedgerTable)
    .where(eq(shopLedgerTable.sellerId, sellerId))
    .orderBy(desc(shopLedgerTable.id))
    .limit(100);
  res.json(
    GetShopWalletResponse.parse({
      balanceCents,
      pendingWithdrawCents: pending?.total ?? 0,
      ledger: ledger.map((l) => ({
        id: l.id,
        orderId: l.orderId,
        withdrawalId: l.withdrawalId,
        kind: l.kind,
        amountCents: l.amountCents,
        note: l.note,
        createdAt: l.createdAt,
      })),
    }),
  );
});

router.get("/shop/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(shopWithdrawalsTable)
    .where(eq(shopWithdrawalsTable.sellerId, req.userId!))
    .orderBy(desc(shopWithdrawalsTable.id));
  res.json(
    ListShopWithdrawalsResponse.parse(
      rows.map((w) => ({
        id: w.id,
        amountCents: w.amountCents,
        method: w.method,
        details: w.details,
        status: w.status,
        adminNote: w.adminNote,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
      })),
    ),
  );
});

router.post(
  "/shop/withdrawals",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = CreateShopWithdrawalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const sellerId = req.userId!;
    const stall = await loadMyStall(sellerId);
    if (!stall) {
      res.status(400).json({ error: "Stall not found" });
      return;
    }
    const { amountCents, method, details } = parsed.data;
    if (amountCents <= 0) {
      res.status(400).json({ error: "Amount must be greater than zero" });
      return;
    }
    const created = await db.transaction(async (tx) => {
      // Serialize concurrent withdrawals for this seller to prevent overspend.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${sellerId})::bigint)`,
      );
      const [bal] = await tx
        .select({
          total: sql<number>`coalesce(sum(${shopLedgerTable.amountCents}), 0)::int`,
        })
        .from(shopLedgerTable)
        .where(eq(shopLedgerTable.sellerId, sellerId));
      if ((bal?.total ?? 0) < amountCents) return null;
      const [request] = await tx
        .insert(shopWithdrawalsTable)
        .values({
          stallId: stall.id,
          sellerId,
          amountCents,
          method,
          details,
          status: "pending",
        })
        .returning();
      await tx.insert(shopLedgerTable).values({
        stallId: stall.id,
        sellerId,
        withdrawalId: request.id,
        kind: "withdraw",
        amountCents: -amountCents,
        note: `Withdrawal request #${request.id}`,
      });
      return request;
    });
    if (!created) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    res.status(201).json(
      CreateShopWithdrawalResponse.parse({
        id: created.id,
        amountCents: created.amountCents,
        method: created.method,
        details: created.details,
        status: created.status,
        adminNote: created.adminNote,
        createdAt: created.createdAt,
        processedAt: created.processedAt,
      }),
    );
  },
);

export default router;
