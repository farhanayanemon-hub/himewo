import { Router, type IRouter } from "express";
import {
  db,
  shopStallsTable,
  shopProductsTable,
  shopOrdersTable,
  shopLedgerTable,
  shopWithdrawalsTable,
  siteSettingsTable,
  pagesTable,
  profilesTable,
  type ShopOrder,
} from "@workspace/db";
import { and, desc, eq, lt, count, sql, inArray } from "drizzle-orm";
import { requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import { toProfile } from "../../lib/serialize";
import { createNotification } from "../../lib/notify";
import {
  getShopSettings,
  commissionFor,
  SHOP_COMMISSION_KEY,
  SHOP_PAYMENT_INSTRUCTIONS_KEY,
} from "../../lib/shop";
import {
  ListAdminStallsQueryParams,
  ListAdminStallsResponse,
  ListAdminStallProductsParams,
  ListAdminStallProductsResponse,
  ListAdminOrdersQueryParams,
  ListAdminOrdersResponse,
  AdminUpdateOrderParams,
  AdminUpdateOrderBody,
  AdminUpdateOrderResponse,
  VerifyOrderPaymentParams,
  VerifyOrderPaymentBody,
  VerifyOrderPaymentResponse,
  ListAdminPaymentsQueryParams,
  ListAdminPaymentsResponse,
  ListAdminShopWithdrawalsQueryParams,
  ListAdminShopWithdrawalsResponse,
  ProcessShopWithdrawalParams,
  ProcessShopWithdrawalBody,
  ProcessShopWithdrawalResponse,
  GetAdminShopSummaryResponse,
  GetAdminShopSettingsResponse,
  UpdateAdminShopSettingsBody,
  UpdateAdminShopSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

async function enrichOrdersAdmin(orders: ShopOrder[]) {
  if (orders.length === 0) return [];
  const productIds = [...new Set(orders.map((o) => o.productId))];
  const stallIds = [...new Set(orders.map((o) => o.stallId))];
  const buyerIds = [...new Set(orders.map((o) => o.buyerId))];
  const [products, stalls, buyers] = await Promise.all([
    db
      .select({ id: shopProductsTable.id, photos: shopProductsTable.photos })
      .from(shopProductsTable)
      .where(inArray(shopProductsTable.id, productIds)),
    db
      .select({ id: shopStallsTable.id, pageId: shopStallsTable.pageId })
      .from(shopStallsTable)
      .where(inArray(shopStallsTable.id, stallIds)),
    db.select().from(profilesTable).where(inArray(profilesTable.id, buyerIds)),
  ]);
  const photoByProduct = new Map(products.map((p) => [p.id, p.photos[0] ?? null]));
  const pageIdByStall = new Map(stalls.map((s) => [s.id, s.pageId]));
  const pageRefs = await loadPageRefs([...pageIdByStall.values()]);
  const buyerMap = new Map(buyers.map((b) => [b.id, toProfile(b)]));
  return orders.map((o) => {
    const pageId = pageIdByStall.get(o.stallId);
    return {
      id: o.id,
      productId: o.productId,
      stallId: o.stallId,
      sellerId: o.sellerId,
      buyerId: o.buyerId,
      quantity: o.quantity,
      unitPriceCents: o.unitPriceCents,
      totalCents: o.totalCents,
      productName: o.productName,
      productPhoto: photoByProduct.get(o.productId) ?? null,
      stallName: pageId != null ? (pageRefs.get(pageId)?.name ?? null) : null,
      deliveryAddress: o.deliveryAddress,
      phone: o.phone,
      paymentMethod: o.paymentMethod,
      paymentRef: o.paymentRef,
      heldCents: o.heldCents,
      status: o.status,
      createdAt: o.createdAt,
      counterpart: buyerMap.get(o.buyerId) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Stalls
// ---------------------------------------------------------------------------

router.get(
  "/shop/stalls",
  requirePermission("shop.view"),
  async (req, res): Promise<void> => {
    const query = ListAdminStallsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const { cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(shopStallsTable)
      .where(cursor ? lt(shopStallsTable.id, cursor) : undefined)
      .orderBy(desc(shopStallsTable.id))
      .limit(limit ?? 30);
    if (rows.length === 0) {
      res.json(ListAdminStallsResponse.parse([]));
      return;
    }
    const stallIds = rows.map((s) => s.id);
    const pageRefs = await loadPageRefs(rows.map((s) => s.pageId));
    const owners = await db
      .select()
      .from(profilesTable)
      .where(inArray(profilesTable.id, [...new Set(rows.map((s) => s.userId))]));
    const ownerMap = new Map(owners.map((o) => [o.id, toProfile(o)]));
    const productCounts = await db
      .select({
        stallId: shopProductsTable.stallId,
        value: count(),
      })
      .from(shopProductsTable)
      .where(inArray(shopProductsTable.stallId, stallIds))
      .groupBy(shopProductsTable.stallId);
    const orderCounts = await db
      .select({ stallId: shopOrdersTable.stallId, value: count() })
      .from(shopOrdersTable)
      .where(inArray(shopOrdersTable.stallId, stallIds))
      .groupBy(shopOrdersTable.stallId);
    const pcMap = new Map(productCounts.map((r) => [r.stallId, r.value]));
    const ocMap = new Map(orderCounts.map((r) => [r.stallId, r.value]));
    res.json(
      ListAdminStallsResponse.parse(
        rows.map((s) => ({
          id: s.id,
          userId: s.userId,
          pageId: s.pageId,
          name: pageRefs.get(s.pageId)?.name ?? "Stall",
          avatarUrl: pageRefs.get(s.pageId)?.avatarUrl ?? null,
          active: s.active,
          productCount: pcMap.get(s.id) ?? 0,
          orderCount: ocMap.get(s.id) ?? 0,
          createdAt: s.createdAt,
          owner: ownerMap.get(s.userId) ?? null,
        })),
      ),
    );
  },
);

router.get(
  "/shop/stalls/:id/products",
  requirePermission("shop.view"),
  async (req, res): Promise<void> => {
    const params = ListAdminStallProductsParams.safeParse(req.params);
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
    const stallName = pageRefs.get(stall.pageId)?.name ?? null;
    const rows = await db
      .select()
      .from(shopProductsTable)
      .where(eq(shopProductsTable.stallId, stall.id))
      .orderBy(desc(shopProductsTable.id));
    res.json(
      ListAdminStallProductsResponse.parse(
        rows.map((p) => ({
          id: p.id,
          stallId: p.stallId,
          stallName,
          photos: p.photos,
          name: p.name,
          priceCents: p.priceCents,
          description: p.description,
          stockQty: p.stockQty,
          active: p.active,
          createdAt: p.createdAt,
        })),
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

router.get(
  "/shop/orders",
  requirePermission("shop.view"),
  async (req, res): Promise<void> => {
    const query = ListAdminOrdersQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const { status, paymentMethod, cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(shopOrdersTable)
      .where(
        and(
          status ? eq(shopOrdersTable.status, status) : undefined,
          paymentMethod
            ? eq(shopOrdersTable.paymentMethod, paymentMethod)
            : undefined,
          cursor ? lt(shopOrdersTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(shopOrdersTable.id))
      .limit(limit ?? 30);
    res.json(ListAdminOrdersResponse.parse(await enrichOrdersAdmin(rows)));
  },
);

router.patch(
  "/shop/orders/:id",
  requirePermission("shop.manage"),
  async (req, res): Promise<void> => {
    const params = AdminUpdateOrderParams.safeParse(req.params);
    const body = AdminUpdateOrderBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const target = body.data.status;
    const [order] = await db
      .select()
      .from(shopOrdersTable)
      .where(eq(shopOrdersTable.id, params.data.id));
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const settings = await getShopSettings();
    const updated = await db.transaction(async (tx) => {
      const done = await tx
        .update(shopOrdersTable)
        .set({
          status: target,
          ...(target === "completed" ? { heldCents: 0 } : {}),
        })
        .where(eq(shopOrdersTable.id, order.id))
        .returning();
      const row = done[0];
      // Restore stock when cancelling a non-cancelled order.
      if (target === "cancelled" && order.status !== "cancelled") {
        await tx
          .update(shopProductsTable)
          .set({
            stockQty: sql`${shopProductsTable.stockQty} + ${order.quantity}`,
          })
          .where(eq(shopProductsTable.id, order.productId));
      }
      // Accrue commission on completion (idempotent via unique (orderId, kind)).
      if (target === "completed" && order.status !== "completed") {
        const commission = commissionFor(order.totalCents, settings.commissionPercent);
        if (order.paymentMethod === "direct") {
          await tx
            .insert(shopLedgerTable)
            .values({
              stallId: order.stallId,
              sellerId: order.sellerId,
              orderId: order.id,
              kind: "sale_credit",
              amountCents: order.totalCents - commission,
              note: `Sale #${order.id} (admin completed)`,
            })
            .onConflictDoNothing();
        } else {
          await tx
            .insert(shopLedgerTable)
            .values({
              stallId: order.stallId,
              sellerId: order.sellerId,
              orderId: order.id,
              kind: "cod_commission",
              amountCents: -commission,
              note: `COD commission for sale #${order.id} (admin completed)`,
            })
            .onConflictDoNothing();
        }
      }
      return row;
    });
    await writeAudit({
      actorId: req.userId,
      action: "shop.order.status",
      targetType: "shop_order",
      targetId: String(order.id),
      metadata: { from: order.status, to: target },
    });
    const [enriched] = await enrichOrdersAdmin([updated]);
    res.json(AdminUpdateOrderResponse.parse(enriched));
  },
);

router.post(
  "/shop/orders/:id/verify-payment",
  requirePermission("shop.manage"),
  async (req, res): Promise<void> => {
    const params = VerifyOrderPaymentParams.safeParse(req.params);
    const body = VerifyOrderPaymentBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
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
    if (order.paymentMethod !== "direct") {
      res.status(400).json({ error: "This order is not a direct payment" });
      return;
    }
    if (order.status !== "awaiting_verification") {
      res.status(400).json({ error: "This payment is not awaiting verification" });
      return;
    }
    const approve = body.data.approve;
    let updatedRow: ShopOrder;
    if (approve) {
      // Payment confirmed: hold funds and move to pending.
      const done = await db
        .update(shopOrdersTable)
        .set({ status: "pending", heldCents: order.totalCents })
        .where(
          and(
            eq(shopOrdersTable.id, order.id),
            eq(shopOrdersTable.status, "awaiting_verification"),
          ),
        )
        .returning();
      updatedRow = done[0];
    } else {
      // Restore stock and cancel.
      const done = await db.transaction(async (tx) => {
        const d = await tx
          .update(shopOrdersTable)
          .set({ status: "cancelled" })
          .where(
            and(
              eq(shopOrdersTable.id, order.id),
              eq(shopOrdersTable.status, "awaiting_verification"),
            ),
          )
          .returning();
        // Only restore stock if we actually performed the cancellation —
        // a concurrent admin may have already processed this payment, and
        // an unconditional restore would over-credit inventory.
        if (d.length > 0) {
          await tx
            .update(shopProductsTable)
            .set({
              stockQty: sql`${shopProductsTable.stockQty} + ${order.quantity}`,
            })
            .where(eq(shopProductsTable.id, order.productId));
        }
        return d[0];
      });
      updatedRow = done;
    }
    if (!updatedRow) {
      res.status(409).json({ error: "This payment was already processed" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "shop.payment.verify",
      targetType: "shop_order",
      targetId: String(order.id),
      metadata: { approve, note: body.data.note ?? null },
    });
    // Notify the buyer of the payment decision.
    await createNotification({
      userId: order.buyerId,
      actorId: req.userId!,
      type: "shop_order",
      entityType: "shop_order",
      entityId: order.id,
    });
    const [enriched] = await enrichOrdersAdmin([updatedRow]);
    res.json(VerifyOrderPaymentResponse.parse(enriched));
  },
);

router.get(
  "/shop/payments",
  requirePermission("shop.view"),
  async (req, res): Promise<void> => {
    const query = ListAdminPaymentsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const { cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(shopOrdersTable)
      .where(
        and(
          eq(shopOrdersTable.status, "awaiting_verification"),
          cursor ? lt(shopOrdersTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(shopOrdersTable.id))
      .limit(limit ?? 30);
    res.json(ListAdminPaymentsResponse.parse(await enrichOrdersAdmin(rows)));
  },
);

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

router.get(
  "/shop/withdrawals",
  requirePermission("shop.view"),
  async (req, res): Promise<void> => {
    const query = ListAdminShopWithdrawalsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const { status, cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(shopWithdrawalsTable)
      .where(
        and(
          status ? eq(shopWithdrawalsTable.status, status) : undefined,
          cursor ? lt(shopWithdrawalsTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(shopWithdrawalsTable.id))
      .limit(limit ?? 30);
    const sellerIds = [...new Set(rows.map((r) => r.sellerId))];
    const stallIds = [...new Set(rows.map((r) => r.stallId))];
    const [sellers, stalls] = await Promise.all([
      sellerIds.length
        ? db.select().from(profilesTable).where(inArray(profilesTable.id, sellerIds))
        : Promise.resolve([]),
      stallIds.length
        ? db
            .select({ id: shopStallsTable.id, pageId: shopStallsTable.pageId })
            .from(shopStallsTable)
            .where(inArray(shopStallsTable.id, stallIds))
        : Promise.resolve([]),
    ]);
    const sellerMap = new Map(sellers.map((s) => [s.id, toProfile(s)]));
    const pageIdByStall = new Map(stalls.map((s) => [s.id, s.pageId]));
    const pageRefs = await loadPageRefs([...pageIdByStall.values()]);
    res.json(
      ListAdminShopWithdrawalsResponse.parse(
        rows.map((w) => {
          const pageId = pageIdByStall.get(w.stallId);
          return {
            id: w.id,
            sellerId: w.sellerId,
            stallId: w.stallId,
            amountCents: w.amountCents,
            method: w.method,
            details: w.details,
            status: w.status,
            adminNote: w.adminNote,
            processedBy: w.processedBy,
            createdAt: w.createdAt,
            processedAt: w.processedAt,
            seller: sellerMap.get(w.sellerId) ?? null,
            stallName: pageId != null ? (pageRefs.get(pageId)?.name ?? null) : null,
          };
        }),
      ),
    );
  },
);

router.post(
  "/shop/withdrawals/:id",
  requirePermission("shop.manage"),
  async (req, res): Promise<void> => {
    const params = ProcessShopWithdrawalParams.safeParse(req.params);
    const body = ProcessShopWithdrawalBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [w] = await db
      .select()
      .from(shopWithdrawalsTable)
      .where(eq(shopWithdrawalsTable.id, params.data.id));
    if (!w) {
      res.status(404).json({ error: "Withdrawal not found" });
      return;
    }
    if (w.status !== "pending") {
      res.status(400).json({ error: "This withdrawal has already been processed" });
      return;
    }
    const approve = body.data.approve;
    const note = body.data.note ?? null;
    const updated = await db.transaction(async (tx) => {
      const done = await tx
        .update(shopWithdrawalsTable)
        .set({
          status: approve ? "approved" : "rejected",
          adminNote: note,
          processedBy: req.userId!,
          processedAt: new Date(),
        })
        .where(
          and(
            eq(shopWithdrawalsTable.id, w.id),
            eq(shopWithdrawalsTable.status, "pending"),
          ),
        )
        .returning();
      if (done.length === 0) return null;
      // Approve = mark paid out (no further ledger move; already debited at
      // request time). Reject = refund via a positive ledger row.
      if (!approve) {
        await tx.insert(shopLedgerTable).values({
          stallId: w.stallId,
          sellerId: w.sellerId,
          withdrawalId: w.id,
          kind: "withdraw_refund",
          amountCents: w.amountCents,
          note: `Refund for rejected withdrawal #${w.id}`,
        });
      }
      return done[0];
    });
    if (!updated) {
      res.status(400).json({ error: "This withdrawal has already been processed" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "shop.withdrawal.process",
      targetType: "shop_withdrawal",
      targetId: String(w.id),
      metadata: { approve, note },
    });
    await createNotification({
      userId: w.sellerId,
      actorId: req.userId!,
      type: "shop_withdrawal",
      entityType: "shop_withdrawal",
      entityId: w.id,
    });
    const pageRefs = await (async () => {
      const [stall] = await db
        .select({ pageId: shopStallsTable.pageId })
        .from(shopStallsTable)
        .where(eq(shopStallsTable.id, updated.stallId));
      return stall ? loadPageRefs([stall.pageId]).then((m) => ({ pageId: stall.pageId, m })) : null;
    })();
    const [seller] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, updated.sellerId));
    res.json(
      ProcessShopWithdrawalResponse.parse({
        id: updated.id,
        sellerId: updated.sellerId,
        stallId: updated.stallId,
        amountCents: updated.amountCents,
        method: updated.method,
        details: updated.details,
        status: updated.status,
        adminNote: updated.adminNote,
        processedBy: updated.processedBy,
        createdAt: updated.createdAt,
        processedAt: updated.processedAt,
        seller: seller ? toProfile(seller) : null,
        stallName: pageRefs ? (pageRefs.m.get(pageRefs.pageId)?.name ?? null) : null,
      }),
    );
  },
);

// ---------------------------------------------------------------------------
// Summary & settings
// ---------------------------------------------------------------------------

router.get(
  "/shop/summary",
  requirePermission("shop.view"),
  async (_req, res): Promise<void> => {
    const [profit] = await db
      .select({
        total: sql<number>`coalesce(sum(abs(${shopLedgerTable.amountCents})), 0)::int`,
      })
      .from(shopLedgerTable)
      .where(
        inArray(shopLedgerTable.kind, ["cod_commission"]),
      );
    // Platform profit = commission taken. For direct sales the commission is
    // (total - net credit); we track it as the difference held, so sum the
    // gap between order totals and sale_credit rows. Simpler: commission is
    // explicitly the cod_commission debits + (total - sale_credit) for direct.
    const [directGap] = await db
      .select({
        total: sql<number>`coalesce(sum(${shopOrdersTable.totalCents} - ${shopLedgerTable.amountCents}), 0)::int`,
      })
      .from(shopLedgerTable)
      .innerJoin(
        shopOrdersTable,
        eq(shopLedgerTable.orderId, shopOrdersTable.id),
      )
      .where(eq(shopLedgerTable.kind, "sale_credit"));
    const [held] = await db
      .select({
        total: sql<number>`coalesce(sum(${shopOrdersTable.heldCents}), 0)::int`,
      })
      .from(shopOrdersTable)
      .where(
        and(
          eq(shopOrdersTable.paymentMethod, "direct"),
          inArray(shopOrdersTable.status, ["pending", "confirmed", "delivered"]),
        ),
      );
    const [stallCount] = await db.select({ value: count() }).from(shopStallsTable);
    const [orderCount] = await db.select({ value: count() }).from(shopOrdersTable);
    const [pendingPayment] = await db
      .select({ value: count() })
      .from(shopOrdersTable)
      .where(eq(shopOrdersTable.status, "awaiting_verification"));
    const [pendingWithdrawal] = await db
      .select({ value: count() })
      .from(shopWithdrawalsTable)
      .where(eq(shopWithdrawalsTable.status, "pending"));
    const platformProfitCents =
      (profit?.total ?? 0) + (directGap?.total ?? 0);
    res.json(
      GetAdminShopSummaryResponse.parse({
        platformProfitCents,
        heldFundsCents: held?.total ?? 0,
        stallCount: stallCount?.value ?? 0,
        orderCount: orderCount?.value ?? 0,
        pendingPaymentCount: pendingPayment?.value ?? 0,
        pendingWithdrawalCount: pendingWithdrawal?.value ?? 0,
      }),
    );
  },
);

router.get(
  "/shop/settings",
  requirePermission("shop.view"),
  async (_req, res): Promise<void> => {
    res.json(GetAdminShopSettingsResponse.parse(await getShopSettings()));
  },
);

router.patch(
  "/shop/settings",
  requirePermission("shop.manage"),
  async (req, res): Promise<void> => {
    const body = UpdateAdminShopSettingsBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const updates: { key: string; value: string }[] = [];
    if (body.data.commissionPercent !== undefined) {
      updates.push({
        key: SHOP_COMMISSION_KEY,
        value: String(body.data.commissionPercent),
      });
    }
    if (body.data.paymentInstructions !== undefined) {
      updates.push({
        key: SHOP_PAYMENT_INSTRUCTIONS_KEY,
        value: body.data.paymentInstructions,
      });
    }
    for (const u of updates) {
      await db
        .insert(siteSettingsTable)
        .values({ key: u.key, value: u.value, updatedBy: req.userId! })
        .onConflictDoUpdate({
          target: siteSettingsTable.key,
          set: { value: u.value, updatedBy: req.userId! },
        });
    }
    await writeAudit({
      actorId: req.userId,
      action: "shop.settings.update",
      targetType: "site_setting",
      targetId: "shop",
      metadata: { ...body.data },
    });
    res.json(UpdateAdminShopSettingsResponse.parse(await getShopSettings()));
  },
);

export default router;
