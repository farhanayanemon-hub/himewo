import { Router, type IRouter } from "express";
import { db, marketplaceListingsTable } from "@workspace/db";
import { and, eq, lt, desc, ilike, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildListings, buildListingById } from "../lib/serialize";
import {
  ListMarketplaceListingsResponse,
  ListMarketplaceListingsQueryParams,
  CreateMarketplaceListingBody,
  CreateMarketplaceListingResponse,
  GetSellingDashboardResponse,
  GetMarketplaceListingParams,
  GetMarketplaceListingResponse,
  UpdateMarketplaceListingParams,
  UpdateMarketplaceListingBody,
  UpdateMarketplaceListingResponse,
  DeleteMarketplaceListingParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/marketplace", requireAuth, async (req, res): Promise<void> => {
  const query = ListMarketplaceListingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { category, search, cursor, limit } = query.data;
  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(
      and(
        eq(marketplaceListingsTable.status, "available"),
        category ? eq(marketplaceListingsTable.category, category) : undefined,
        search ? ilike(marketplaceListingsTable.title, `%${search}%`) : undefined,
        cursor ? lt(marketplaceListingsTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(marketplaceListingsTable.id))
    .limit(limit ?? 20);
  const built = await buildListings(rows, req.userId);
  res.json(ListMarketplaceListingsResponse.parse(built));
});

router.post("/marketplace", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMarketplaceListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [listing] = await db
    .insert(marketplaceListingsTable)
    .values({
      sellerId: req.userId!,
      title: parsed.data.title,
      price: parsed.data.price,
      currency: parsed.data.currency ?? "BDT",
      category: parsed.data.category ?? "other",
      condition: parsed.data.condition ?? "used_good",
      description: parsed.data.description ?? "",
      location: parsed.data.location ?? null,
      photos: parsed.data.photos ?? [],
    })
    .returning();
  const built = await buildListingById(listing.id, req.userId);
  res.status(201).json(CreateMarketplaceListingResponse.parse(built));
});

router.get(
  "/marketplace/selling",
  requireAuth,
  async (req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.sellerId, req.userId!))
      .orderBy(desc(marketplaceListingsTable.id));
    const [[active], [sold]] = await Promise.all([
      db
        .select({ value: count() })
        .from(marketplaceListingsTable)
        .where(
          and(
            eq(marketplaceListingsTable.sellerId, req.userId!),
            eq(marketplaceListingsTable.status, "available"),
          ),
        ),
      db
        .select({ value: count() })
        .from(marketplaceListingsTable)
        .where(
          and(
            eq(marketplaceListingsTable.sellerId, req.userId!),
            eq(marketplaceListingsTable.status, "sold"),
          ),
        ),
    ]);
    const listings = await buildListings(rows, req.userId);
    res.json(
      GetSellingDashboardResponse.parse({
        activeListings: active?.value ?? 0,
        soldListings: sold?.value ?? 0,
        totalListings: rows.length,
        listings,
      }),
    );
  },
);

router.get("/marketplace/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetMarketplaceListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const listing = await buildListingById(params.data.id, req.userId);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json(GetMarketplaceListingResponse.parse(listing));
});

router.patch(
  "/marketplace/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateMarketplaceListingParams.safeParse(req.params);
    const body = UpdateMarketplaceListingBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [existing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (existing.sellerId !== req.userId) {
      res.status(403).json({ error: "Not your listing" });
      return;
    }
    await db
      .update(marketplaceListingsTable)
      .set({
        ...(body.data.title !== undefined ? { title: body.data.title } : {}),
        ...(body.data.price !== undefined ? { price: body.data.price } : {}),
        ...(body.data.category !== undefined
          ? { category: body.data.category }
          : {}),
        ...(body.data.condition !== undefined
          ? { condition: body.data.condition }
          : {}),
        ...(body.data.description !== undefined
          ? { description: body.data.description }
          : {}),
        ...(body.data.location !== undefined
          ? { location: body.data.location }
          : {}),
        ...(body.data.photos !== undefined ? { photos: body.data.photos } : {}),
        ...(body.data.status !== undefined ? { status: body.data.status } : {}),
      })
      .where(eq(marketplaceListingsTable.id, params.data.id));
    const listing = await buildListingById(params.data.id, req.userId);
    res.json(UpdateMarketplaceListingResponse.parse(listing));
  },
);

router.delete(
  "/marketplace/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteMarketplaceListingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [existing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, params.data.id));
    if (!existing) {
      res.sendStatus(204);
      return;
    }
    if (existing.sellerId !== req.userId) {
      res.status(403).json({ error: "Not your listing" });
      return;
    }
    await db
      .delete(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, params.data.id));
    res.sendStatus(204);
  },
);

export default router;
