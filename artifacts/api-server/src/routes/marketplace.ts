import { Router, type IRouter } from "express";
import { db, marketplaceListingsTable } from "@workspace/db";
import {
  and,
  eq,
  lt,
  desc,
  ilike,
  count,
  sql,
  isNotNull,
  getTableColumns,
} from "drizzle-orm";
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
  GeocodeLocationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type GeocodeResult = { displayName: string; lat: number; lng: number };

// Small in-memory TTL cache so repeated queries (autocomplete typing the same
// place) don't hammer Nominatim, which is rate-limited (~1 req/sec).
const GEOCODE_CACHE_TTL_MS = 10 * 60 * 1000;
const geocodeCache = new Map<string, { at: number; results: GeocodeResult[] }>();

// Free, keyless geocoding via OpenStreetMap Nominatim. Nominatim requires a
// descriptive User-Agent and is rate-limited (~1 req/sec). No API key needed.
async function geocode(q: string): Promise<GeocodeResult[]> {
  const key = q.toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached && Date.now() - cached.at < GEOCODE_CACHE_TTL_MS) {
    return cached.results;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let resp: Response;
  try {
    resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "HiMewo/1.0 (marketplace location search; https://himewo.com)",
        "Accept-Language": "en",
      },
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) return [];
  const data = (await resp.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;
  const results = data
    .map((d) => ({
      displayName: d.display_name ?? "",
      lat: Number(d.lat),
      lng: Number(d.lon),
    }))
    .filter(
      (d) => d.displayName && Number.isFinite(d.lat) && Number.isFinite(d.lng),
    );

  geocodeCache.set(key, { at: Date.now(), results });
  return results;
}

router.get("/marketplace", requireAuth, async (req, res): Promise<void> => {
  const query = ListMarketplaceListingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { category, search, cursor, limit, lat, lng, radiusKm } = query.data;
  const useGeo = lat != null && lng != null;

  if (useGeo) {
    // Haversine distance (km) from the viewer's point to each listing.
    const distExpr = sql<number>`(6371 * acos(least(1, greatest(-1,
      cos(radians(${lat})) * cos(radians(${marketplaceListingsTable.lat})) *
      cos(radians(${marketplaceListingsTable.lng}) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(${marketplaceListingsTable.lat}))
    ))))`;
    const radius = radiusKm ?? 25;
    const rows = await db
      .select({ ...getTableColumns(marketplaceListingsTable), dist: distExpr })
      .from(marketplaceListingsTable)
      .where(
        and(
          eq(marketplaceListingsTable.status, "available"),
          category ? eq(marketplaceListingsTable.category, category) : undefined,
          search
            ? ilike(marketplaceListingsTable.title, `%${search}%`)
            : undefined,
          isNotNull(marketplaceListingsTable.lat),
          isNotNull(marketplaceListingsTable.lng),
          sql`${distExpr} <= ${radius}`,
        ),
      )
      .orderBy(distExpr)
      .limit(limit ?? 20);
    const distances = new Map(rows.map((r) => [r.id, r.dist]));
    const built = await buildListings(rows, req.userId, distances);
    res.json(ListMarketplaceListingsResponse.parse(built));
    return;
  }

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

router.get(
  "/marketplace/geocode",
  requireAuth,
  async (req, res): Promise<void> => {
    const q = String(req.query.q ?? "").trim().slice(0, 120);
    if (q.length < 2) {
      res.json([]);
      return;
    }
    const results = await geocode(q);
    res.json(GeocodeLocationResponse.parse(results));
  },
);

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
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
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
        ...(body.data.lat !== undefined ? { lat: body.data.lat } : {}),
        ...(body.data.lng !== undefined ? { lng: body.data.lng } : {}),
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
