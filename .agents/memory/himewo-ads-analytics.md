---
name: Ads Analytics + Insights
description: How ad insights aggregation, spend↔billing reconciliation, the pixel token, and conversion attribution work.
---

# Ads Analytics + Insights

Lives in `artifacts/api-server/src/lib/analytics.ts`; routes in `routes/ads.ts`;
UI in `artifacts/ads-dashboard/src/pages/insights.tsx`.

## Spend reconciles with billing BY CONSTRUCTION
`getInsights` spend = `sum(ad_impressions.cost_cents) + sum(ad_clicks.cost_cents)`
over the range — the SAME per-event cost the billing engine charged. Do NOT
recompute spend from budgets or a separate table; it would drift from the ledger.
**How to apply:** any new billable ad event must write its `cost_cents` on the
event row, or insights will under-report spend vs the wallet.

## ctr is a FRACTION (0..1)
`summary.ctr` and row ctr are fractions; the UI multiplies ×100 for display.
cpc/cpm/costPerResult are nullable (null when denominator is 0). Reach =
`count(distinct viewer_id)`.

## roas + cost-per-conversion
`roas` (summary + every breakdown row) = `conversionValueCents / spentCents`,
null ONLY when spend is 0 (when conversions are 0 but spend>0, roas is a real 0).
`costPerResultCents` (spend/conversions) IS the cost-per-conversion — do NOT add
a duplicate `costPerConversionCents` field; the UI already labels it "Cost /
conversion". All these ratios live in the single `ratios()` helper.

## Pixel token = HMAC, NOT a DB row
`signPixelToken(accountId)` → `px_<accountId>_<hmac24>` using SESSION_SECRET;
`verifyPixelToken` returns accountId or null. Stateless — no pixel table lookup.
SESSION_SECRET is a secret (bash env), NOT visible to code_execution process.env.

## Public beacon route ordering + no-leak
Public `POST /ads/pixel` + `GET /ads/pixel.gif` (1x1) MUST be registered BEFORE
`/ads/:id` or the `:id` param route swallows them. `pixel.gif` ALWAYS returns
200 image/gif even on a bad token — never leak token validity to the browser.
`POST /ads/pixel` DOES 400 on a bad token (server-to-server caller wants the error).

## Conversion attribution order (capturePixelConversion)
1. explicit `adId` verified account-owned (join ads→ad_sets→ad_campaigns on account_id)
2. last-click: viewer's most recent `ad_clicks` row within ATTRIBUTION_WINDOW (7d)
3. unattributed → `ad_id` null. `attributed = (adId != null)`.
Summary conversions (unscoped) INCLUDE unattributed rows; scoped/breakdown
conversions join ads so they EXCLUDE unattributed (ad_id null) rows.

## Deploy target
ads-dashboard → Cloudflare Pages project `himewo-ads` (ads.himewo.com). Build with
BASE_PATH=/ + VITE_API_URL/VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY, copy dist/public
OUTSIDE repo, wrangler pages deploy. API is the Railway auto-deploy from GitHub main.
