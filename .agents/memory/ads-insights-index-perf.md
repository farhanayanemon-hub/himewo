---
name: Ads Insights query performance (indexes + sargable date filter)
description: How the insights aggregation stays fast at scale — composite indexes on event tables and the sargable date-range predicate that lets them be used.
---

## Composite indexes on the event tables

Each event table (`ad_impressions`, `ad_clicks`, `ad_conversions`) carries three
composite btree indexes leading with `account_id` (always an equality filter):
`(account_id, created_at)`, `(account_id, campaign_id, created_at)`,
`(account_id, ad_set_id, created_at)`. They are declared in the Drizzle schema
(`lib/db/src/schema/ads.ts`) so they are the source of truth.

- `(account_id, created_at)` serves the unscoped summary/series/breakdown filter.
- `(account_id, campaign_id, created_at)` / `(account_id, ad_set_id, created_at)`
  serve the campaign-/ad-set-scoped views (often index-only scans).
- No `ad_id` index: breakdown-by-ad has no `ad_id` filter, so grouping happens as a
  hash-agg over the date-range-filtered rows.

## The date filter MUST stay sargable — do not cast the column

**Rule:** filter with `created_at >= $from::date AND created_at < ($to::date + INTERVAL '1 day')`.
NEVER `created_at::date >= $from` / `created_at::date <= $to`.

**Why:** casting the *column* (`created_at::date`) makes the predicate non-sargable —
Postgres can use `account_id` from the index but must scan the whole account's
history and re-filter every row by date, which is the exact slowness this guards
against. The half-open range on the raw `timestamptz` is semantically identical
(both resolve day boundaries in the session TZ) but lets the btree serve the range.
Verified with EXPLAIN ANALYZE: Index Scan / Index-Only Scan with the full
`(account_id, created_at, ...)` range as the Index Cond.

**How to apply:** if you ever add new filter/group columns or a rollup, keep the
column bare on the left of comparisons and push casts to the parameter side.

## Rollup table deemed unnecessary (for now)

The task suggested "consider a pre-aggregated daily rollup if raw aggregation stays
slow." With the indexes + sargable filter, aggregating ~15k rows out of a 576k-row
table ran in ~20ms. Raw aggregation is fast enough; a rollup was intentionally NOT
added to avoid the write-path/consistency cost. Revisit only if a single account's
event volume makes the date-range slice itself huge.
