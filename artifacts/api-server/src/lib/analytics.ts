import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Ads analytics + insights engine.
//
// Spend reported here is derived from the per-event `cost_cents` written on
// each impression / click row by the billing engine (chargeAdEvent). Those
// same cents are what increments the account / campaign / ad-set spend and the
// ad_spend_daily rollup, so the numbers reported here reconcile with billing
// by construction — there is a single source of truth for "how much was
// charged for this event".
// ---------------------------------------------------------------------------

export type InsightsLevel = "campaign" | "adset" | "ad";

/** Attribution window for last-click pixel conversions. */
const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const PIXEL_SECRET = process.env.SESSION_SECRET || "himewo-dev-pixel-secret";

async function rows<T = Record<string, unknown>>(q: SQL): Promise<T[]> {
  const r = await db.execute(q);
  return (r as unknown as { rows: T[] }).rows;
}

function toInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

// ---------------------------------------------------------------------------
// Pixel token: HMAC over the account id. Non-guessable, needs no DB column, and
// lets the public capture endpoint resolve the owning account without auth.
// ---------------------------------------------------------------------------

export function signPixelToken(accountId: number): string {
  const mac = createHmac("sha256", PIXEL_SECRET)
    .update(`pixel:${accountId}`)
    .digest("base64url")
    .slice(0, 24);
  return `px_${accountId}_${mac}`;
}

export function verifyPixelToken(token: string | undefined | null): number | null {
  if (!token) return null;
  const m = /^px_(\d+)_([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  const accountId = Number(m[1]);
  if (!Number.isInteger(accountId) || accountId <= 0) return null;
  const expected = signPixelToken(accountId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return accountId;
}

// ---------------------------------------------------------------------------
// Insights aggregation
// ---------------------------------------------------------------------------

export interface InsightsSummary {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number; // fraction 0..1 (clicks / impressions)
  spentCents: number;
  conversions: number;
  conversionValueCents: number;
  cpcCents: number | null; // spend / clicks
  cpmCents: number | null; // spend / impressions * 1000
  costPerResultCents: number | null; // spend / conversions
}

export interface InsightsRow extends InsightsSummary {
  id: number;
  name: string;
  level: InsightsLevel;
}

export interface InsightsSeriesPoint {
  day: string; // YYYY-MM-DD (account timezone)
  impressions: number;
  clicks: number;
  spentCents: number;
  conversions: number;
}

export interface InsightsResult {
  from: string;
  to: string;
  level: InsightsLevel;
  timezone: string;
  summary: InsightsSummary;
  series: InsightsSeriesPoint[];
  breakdown: InsightsRow[];
}

function ratios(base: {
  impressions: number;
  reach: number;
  clicks: number;
  spentCents: number;
  conversions: number;
  conversionValueCents: number;
}): InsightsSummary {
  const { impressions, clicks, spentCents, conversions } = base;
  return {
    ...base,
    ctr: impressions > 0 ? clicks / impressions : 0,
    cpcCents: clicks > 0 ? Math.round(spentCents / clicks) : null,
    cpmCents: impressions > 0 ? Math.round((spentCents / impressions) * 1000) : null,
    costPerResultCents: conversions > 0 ? Math.round(spentCents / conversions) : null,
  };
}

/** SQL fragment restricting joined ads (`a`) / ad sets (`s`) to the scope. */
function scopeFragment(campaignId?: number, adSetId?: number): SQL {
  if (adSetId != null) return sql` and a.ad_set_id = ${adSetId}`;
  if (campaignId != null) return sql` and s.campaign_id = ${campaignId}`;
  return sql``;
}

/** Group-by key expression for the requested breakdown level. */
function groupExpr(level: InsightsLevel): SQL {
  if (level === "ad") return sql`a.id`;
  if (level === "adset") return sql`a.ad_set_id`;
  return sql`s.campaign_id`;
}

export async function getInsights(opts: {
  accountId: number;
  from: Date;
  to: Date; // exclusive upper bound
  level: InsightsLevel;
  timezone: string;
  campaignId?: number;
  adSetId?: number;
}): Promise<InsightsResult> {
  const { accountId, from, to, level, timezone } = opts;
  const scope = scopeFragment(opts.campaignId, opts.adSetId);
  const gid = groupExpr(level);

  // --- Breakdown: impressions / reach / spend per group ---
  const impByGroup = await rows<{
    gid: number;
    impressions: number;
    reach: number;
    spend: number;
  }>(sql`
    select ${gid} as gid,
           count(*)::int as impressions,
           count(distinct i.viewer_id)::int as reach,
           coalesce(sum(i.cost_cents), 0)::int as spend
    from ad_impressions i
    join ads a on a.id = i.ad_id
    join ad_sets s on s.id = a.ad_set_id
    where i.account_id = ${accountId}
      and i.created_at >= ${from} and i.created_at < ${to}
      ${scope}
    group by ${gid}
  `);

  const clkByGroup = await rows<{ gid: number; clicks: number; spend: number }>(sql`
    select ${gid} as gid,
           count(*)::int as clicks,
           coalesce(sum(c.cost_cents), 0)::int as spend
    from ad_clicks c
    join ads a on a.id = c.ad_id
    join ad_sets s on s.id = a.ad_set_id
    where c.account_id = ${accountId}
      and c.created_at >= ${from} and c.created_at < ${to}
      ${scope}
    group by ${gid}
  `);

  const convByGroup = await rows<{
    gid: number;
    conversions: number;
    value: number;
  }>(sql`
    select ${gid} as gid,
           count(*)::int as conversions,
           coalesce(sum(cv.value_cents), 0)::int as value
    from ad_conversions cv
    join ads a on a.id = cv.ad_id
    join ad_sets s on s.id = a.ad_set_id
    where cv.account_id = ${accountId}
      and cv.created_at >= ${from} and cv.created_at < ${to}
      ${scope}
    group by ${gid}
  `);

  // --- Names for the group ids ---
  const groupIds = Array.from(
    new Set([
      ...impByGroup.map((r) => toInt(r.gid)),
      ...clkByGroup.map((r) => toInt(r.gid)),
      ...convByGroup.map((r) => toInt(r.gid)),
    ]),
  );
  const names = new Map<number, string>();
  if (groupIds.length > 0) {
    const nameTable =
      level === "ad" ? sql`ads` : level === "adset" ? sql`ad_sets` : sql`ad_campaigns`;
    const nameRows = await rows<{ id: number; name: string }>(sql`
      select id, name from ${nameTable} where id in (${sql.join(
        groupIds.map((v) => sql`${v}`),
        sql`, `,
      )})
    `);
    for (const r of nameRows) names.set(toInt(r.id), r.name);
  }

  // --- Merge breakdown rows ---
  const byId = new Map<
    number,
    {
      impressions: number;
      reach: number;
      clicks: number;
      spentCents: number;
      conversions: number;
      conversionValueCents: number;
    }
  >();
  const ensure = (id: number) => {
    let row = byId.get(id);
    if (!row) {
      row = {
        impressions: 0,
        reach: 0,
        clicks: 0,
        spentCents: 0,
        conversions: 0,
        conversionValueCents: 0,
      };
      byId.set(id, row);
    }
    return row;
  };
  for (const r of impByGroup) {
    const row = ensure(toInt(r.gid));
    row.impressions = toInt(r.impressions);
    row.reach = toInt(r.reach);
    row.spentCents += toInt(r.spend);
  }
  for (const r of clkByGroup) {
    const row = ensure(toInt(r.gid));
    row.clicks = toInt(r.clicks);
    row.spentCents += toInt(r.spend);
  }
  for (const r of convByGroup) {
    const row = ensure(toInt(r.gid));
    row.conversions = toInt(r.conversions);
    row.conversionValueCents = toInt(r.value);
  }

  const breakdown: InsightsRow[] = Array.from(byId.entries())
    .map(([id, base]) => ({
      id,
      name: names.get(id) ?? `#${id}`,
      level,
      ...ratios(base),
    }))
    .sort((a, b) => b.spentCents - a.spentCents || b.impressions - a.impressions);

  // --- Summary: impressions/clicks/spend/conv from breakdown; reach + total
  // conversions need dedicated queries (distinct viewers can't be summed, and
  // unattributed conversions have no ad_id so they never appear in a group). ---
  let sImp = 0,
    sClk = 0,
    sSpend = 0,
    sConv = 0,
    sConvVal = 0;
  for (const r of breakdown) {
    sImp += r.impressions;
    sClk += r.clicks;
    sSpend += r.spentCents;
  }

  const reachRow = await rows<{ reach: number }>(sql`
    select count(distinct i.viewer_id)::int as reach
    from ad_impressions i
    join ads a on a.id = i.ad_id
    join ad_sets s on s.id = a.ad_set_id
    where i.account_id = ${accountId}
      and i.created_at >= ${from} and i.created_at < ${to}
      ${scope}
  `);
  const sReach = toInt(reachRow[0]?.reach);

  // Total conversions in scope. With no campaign/adset scope we count ALL of the
  // account's conversions (including unattributed, ad_id null). When scoped we
  // must join to ads, which excludes unattributed rows.
  const convScoped = opts.campaignId != null || opts.adSetId != null;
  const convSumRows = convScoped
    ? await rows<{ conversions: number; value: number }>(sql`
        select count(*)::int as conversions,
               coalesce(sum(cv.value_cents), 0)::int as value
        from ad_conversions cv
        join ads a on a.id = cv.ad_id
        join ad_sets s on s.id = a.ad_set_id
        where cv.account_id = ${accountId}
          and cv.created_at >= ${from} and cv.created_at < ${to}
          ${scope}
      `)
    : await rows<{ conversions: number; value: number }>(sql`
        select count(*)::int as conversions,
               coalesce(sum(value_cents), 0)::int as value
        from ad_conversions
        where account_id = ${accountId}
          and created_at >= ${from} and created_at < ${to}
      `);
  sConv = toInt(convSumRows[0]?.conversions);
  sConvVal = toInt(convSumRows[0]?.value);

  const summary = ratios({
    impressions: sImp,
    reach: sReach,
    clicks: sClk,
    spentCents: sSpend,
    conversions: sConv,
    conversionValueCents: sConvVal,
  });

  // --- Time series (per account-timezone calendar day) ---
  const impDay = await rows<{ day: string; impressions: number; spend: number }>(sql`
    select (i.created_at at time zone ${timezone})::date::text as day,
           count(*)::int as impressions,
           coalesce(sum(i.cost_cents), 0)::int as spend
    from ad_impressions i
    join ads a on a.id = i.ad_id
    join ad_sets s on s.id = a.ad_set_id
    where i.account_id = ${accountId}
      and i.created_at >= ${from} and i.created_at < ${to}
      ${scope}
    group by 1
  `);
  const clkDay = await rows<{ day: string; clicks: number; spend: number }>(sql`
    select (c.created_at at time zone ${timezone})::date::text as day,
           count(*)::int as clicks,
           coalesce(sum(c.cost_cents), 0)::int as spend
    from ad_clicks c
    join ads a on a.id = c.ad_id
    join ad_sets s on s.id = a.ad_set_id
    where c.account_id = ${accountId}
      and c.created_at >= ${from} and c.created_at < ${to}
      ${scope}
    group by 1
  `);
  const convDay = convScoped
    ? await rows<{ day: string; conversions: number }>(sql`
        select (cv.created_at at time zone ${timezone})::date::text as day,
               count(*)::int as conversions
        from ad_conversions cv
        join ads a on a.id = cv.ad_id
        join ad_sets s on s.id = a.ad_set_id
        where cv.account_id = ${accountId}
          and cv.created_at >= ${from} and cv.created_at < ${to}
          ${scope}
        group by 1
      `)
    : await rows<{ day: string; conversions: number }>(sql`
        select (created_at at time zone ${timezone})::date::text as day,
               count(*)::int as conversions
        from ad_conversions
        where account_id = ${accountId}
          and created_at >= ${from} and created_at < ${to}
        group by 1
      `);

  const seriesMap = new Map<string, InsightsSeriesPoint>();
  const point = (day: string) => {
    let p = seriesMap.get(day);
    if (!p) {
      p = { day, impressions: 0, clicks: 0, spentCents: 0, conversions: 0 };
      seriesMap.set(day, p);
    }
    return p;
  };
  for (const r of impDay) {
    const p = point(String(r.day));
    p.impressions = toInt(r.impressions);
    p.spentCents += toInt(r.spend);
  }
  for (const r of clkDay) {
    const p = point(String(r.day));
    p.clicks = toInt(r.clicks);
    p.spentCents += toInt(r.spend);
  }
  for (const r of convDay) {
    const p = point(String(r.day));
    p.conversions = toInt(r.conversions);
  }

  // Fill gaps so the chart has one point per calendar day in the range.
  const series = fillDays(from, to, timezone, seriesMap);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    level,
    timezone,
    summary,
    series,
    breakdown,
  };
}

/** Produce a dense, sorted day list [from, to) in the account timezone. */
function fillDays(
  from: Date,
  to: Date,
  timezone: string,
  present: Map<string, InsightsSeriesPoint>,
): InsightsSeriesPoint[] {
  const days: string[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // Walk in UTC-day steps; dedupe the resulting local day keys. Cap to a year
  // so a bad range can't blow up.
  const maxDays = 366;
  let cursor = from.getTime();
  const end = to.getTime();
  const seen = new Set<string>();
  while (cursor < end && days.length < maxDays) {
    const key = fmt.format(new Date(cursor));
    if (!seen.has(key)) {
      seen.add(key);
      days.push(key);
    }
    cursor += 24 * 60 * 60 * 1000;
  }
  // Ensure any day that has data but was missed by the walk is included.
  for (const key of present.keys()) {
    if (!seen.has(key)) {
      seen.add(key);
      days.push(key);
    }
  }
  days.sort();
  return days.map(
    (day) =>
      present.get(day) ?? {
        day,
        impressions: 0,
        clicks: 0,
        spentCents: 0,
        conversions: 0,
      },
  );
}

// ---------------------------------------------------------------------------
// Conversion capture (pixel)
// ---------------------------------------------------------------------------

export interface CaptureConversionResult {
  id: number;
  adId: number | null;
  attributed: boolean;
}

/**
 * Record a conversion for an account. Attribution order:
 *  1. explicit adId (verified to belong to the account)
 *  2. last-click: the viewer's most recent click on one of the account's ads
 *     within the attribution window
 *  3. unattributed (accountId only, adId null)
 */
export async function capturePixelConversion(opts: {
  accountId: number;
  eventName: string;
  valueCents?: number;
  currency?: string;
  viewerId?: string | null;
  adId?: number | null;
  pixelId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<CaptureConversionResult> {
  const eventName = (opts.eventName || "conversion").slice(0, 64);
  const valueCents = Math.max(0, Math.trunc(opts.valueCents ?? 0));
  const currency = (opts.currency || "USD").slice(0, 8);
  const viewerId = opts.viewerId || null;

  let resolvedAdId: number | null = null;

  if (opts.adId != null && Number.isInteger(opts.adId)) {
    const owned = await rows<{ id: number }>(sql`
      select a.id
      from ads a
      join ad_sets s on s.id = a.ad_set_id
      join ad_campaigns c on c.id = s.campaign_id
      where a.id = ${opts.adId} and c.account_id = ${opts.accountId}
      limit 1
    `);
    if (owned.length > 0) resolvedAdId = toInt(owned[0].id);
  }

  if (resolvedAdId == null && viewerId) {
    const since = new Date(Date.now() - ATTRIBUTION_WINDOW_MS);
    const recent = await rows<{ ad_id: number }>(sql`
      select cl.ad_id
      from ad_clicks cl
      where cl.account_id = ${opts.accountId}
        and cl.viewer_id = ${viewerId}
        and cl.created_at >= ${since}
      order by cl.created_at desc
      limit 1
    `);
    if (recent.length > 0) resolvedAdId = toInt(recent[0].ad_id);
  }

  const inserted = await rows<{ id: number }>(sql`
    insert into ad_conversions
      (ad_id, account_id, pixel_id, event_name, value_cents, currency, viewer_id, metadata, created_at)
    values (
      ${resolvedAdId},
      ${opts.accountId},
      ${opts.pixelId ?? null},
      ${eventName},
      ${valueCents},
      ${currency},
      ${viewerId},
      ${opts.metadata ? JSON.stringify(opts.metadata) : null}::jsonb,
      now()
    )
    returning id
  `);

  return {
    id: toInt(inserted[0]?.id),
    adId: resolvedAdId,
    attributed: resolvedAdId != null,
  };
}

export interface ConversionRecord {
  id: number;
  adId: number | null;
  adName: string | null;
  eventName: string;
  valueCents: number;
  currency: string;
  createdAt: string;
}

export async function listConversions(opts: {
  accountId: number;
  limit?: number;
}): Promise<ConversionRecord[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const list = await rows<{
    id: number;
    ad_id: number | null;
    ad_name: string | null;
    event_name: string;
    value_cents: number;
    currency: string;
    created_at: string;
  }>(sql`
    select cv.id, cv.ad_id, a.name as ad_name, cv.event_name,
           cv.value_cents, cv.currency, cv.created_at
    from ad_conversions cv
    left join ads a on a.id = cv.ad_id
    where cv.account_id = ${opts.accountId}
    order by cv.created_at desc
    limit ${limit}
  `);
  return list.map((r) => ({
    id: toInt(r.id),
    adId: r.ad_id == null ? null : toInt(r.ad_id),
    adName: r.ad_name ?? null,
    eventName: r.event_name,
    valueCents: toInt(r.value_cents),
    currency: r.currency,
    createdAt: new Date(r.created_at as string | number | Date).toISOString(),
  }));
}
