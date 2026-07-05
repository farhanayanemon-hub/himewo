---
name: Ads backend foundation
description: HiMewo Facebook-style ads data model + management API — structure, authz model, and the multi-tenant reference guard.
---

# Ads backend (ads.himewo.com)

Foundation only: schema + OpenAPI + Express routes + tests. No serving, payments, or UI yet.

## Shape
- Hierarchy: Ad Account (billing container) → Campaign → Ad Set → Ad. Ad Set has 1:1 targeting + N schedules (dayparting). Account also owns creatives, saved audiences, wallet ledger, coupons. Tracking tables (impressions/clicks/conversions) exist but unused this phase.
- Status columns are TEXT (not pgEnum) so live migrations stay additive. Money is integer cents. Wallet is an append-only transaction ledger + a cached `balanceCents` on the account.

## Authz model (ads-auth.ts)
- Roles: admin / advertiser / analyst. Account OWNER is treated as admin. `resolveAdAccountAccess` → `{exists, role}`; helpers canRead / canManageAds / canManageAccount. Members table has a `role` text col; owner auto-added as admin on account create and is owner-protected on member remove/update.
- Route guard `requireAccountAccess` returns 404 when the resource is missing, 403 when it exists but the caller lacks access (existence is enumerable — accepted for this product, not a bug).

## Multi-tenant reference guard (CRITICAL — was an initial bug)
- **Rule:** any foreign ID a client can supply (`creativeId` on ads, `savedAudienceId` on ad sets) MUST be verified to belong to the SAME ad account before persisting — on BOTH create and PATCH. Use `creativeInAccount` / `savedAudienceInAccount` (400 on mismatch).
- **Why:** serial integer PKs are predictable, so without the check a member of account A could attach account B's creative/audience → cross-tenant boundary break. Code review caught this; fixed + regression-tested.
- **How to apply:** whenever a new cross-entity FK is added to an ads write route, add the same "belongs to this account" check. This is the pattern to copy for future ads FKs (e.g. attaching a pixel, a payment method).

## URL guard
- `destinationUrl`, `linkUrl`, `mediaUrls` are http(s)-only via `isSafeUrl` on every create/update (stored-XSS guard).

## Live migration
- Ads tables were created on live Supabase additively via the Management API SQL endpoint (pg_dump the dev DB DDL → CREATE TABLE/SEQUENCE/INDEX IF NOT EXISTS, wrap in one BEGIN/COMMIT). Verify no `ad_%` tables exist first; NEVER drizzle-push to live.

## Account creation limit
- A user may OWN at most **2 ad accounts**. Enforced in `POST /ad-accounts` (prod repo `artifacts/api-server/src/routes/ads.ts`): count rows where `ownerId = uid`, return 403 if `>= 2` BEFORE the insert transaction. Limit counts owned accounts only (not memberships), since only the owner "creates".

## No account-level ad-set/ad list (FB-style views)
- API lists ad sets ONLY per campaign (`/campaigns/{id}/ad-sets`) and ads ONLY per ad set (`/ad-sets/{id}/ads`). There is NO account-wide list. To build any account-wide "all ad sets / all ads" view (e.g. the unified Ads Manager tabs), fan out client-side with react-query `useQueries` over the campaigns → ad-sets → ads chain (getListAdSetsQueryOptions / getListAdsQueryOptions), joining campaign/ad-set names in memory. Ads tab is a 2-level fan-out; Radix Tabs unmount inactive panels so it only fires when that tab is open.

## Status lifecycle (advertiser vs platform)
- Advertiser UI exposes ONLY an ON/OFF toggle (active↔paused) for campaign / ad set / ad. draft/completed/archived + approve/reject are platform/admin-controlled, never offered in the advertiser dashboard.
- New ads are created directly as `status:"in_review", reviewStatus:"pending"` in the createAd handler (POST /ad-sets/:id/ads) — NOT "draft". So every ad auto-enters review on create; no manual submit needed. The `/ads/:id/submit` endpoint + Send button remain only for re-submitting a rejected ad.
- Delivery gate is unchanged: `/ads/serve` requires `reviewStatus==="approved"` + active chain. Advertiser's ON/OFF just flips ad.status active/paused (shown as an inline Switch only once reviewStatus==="approved"; before that a read-only "in review" badge).

## Publish flow (draft → review → run)
- Advertiser builds campaign + ad set(s) + ad(s) all as **draft** (create forms send status:"draft"; no status picker, just a "Draft" badge). Nothing is submitted/served until Publish.
- **Publish is campaign-level and 100% client-side** (in campaigns.tsx `publishCampaign`): reuses EXISTING fetchers — `updateAdCampaign(id,{status:"active"})`, `listAdSets(id)`→ draft ones `updateAdSet(id,{status:"active"})`, `listAds(setId)`→ draft ones `submitAdForReview(id)` (sets ad status in_review + reviewStatus pending).
- **Why no backend /publish endpoint or OpenAPI/codegen change:** prod repo (farhanayanemon-hub/himewo) is edited via GitHub REST; Orval codegen can't be run against it from this Insights-only workspace. Client cascade over existing endpoints avoids all contract/codegen churn.
- Campaign row: status==="draft" → Publish button (Rocket, testid `publish-campaign-${id}`); else On/Off switch (pause/resume via updateAdCampaign active|paused). Same On/Off pattern for ads once approved.
- Serving gate unchanged: ad.reviewStatus==="approved" AND whole chain (campaign/adset/ad) active AND flight window. Admin approval is what makes a published (in_review) ad actually run.

## Unified "Create Ad" wizard
- `components/create-wizard.tsx` (`CreateAdWizard`) is ONE guided dialog (steps Campaign → Audience → Creative & Ad → Review) mounted in the Ads Manager header. It exists BECAUSE campaign/audience/creative/ad each had their own separate page and the user wanted them "ek shathe" (together) in one create flow.
- It orchestrates the existing create fetchers **sequentially** (each needs the previous parent id): createAdCampaign(accountId)→ campaign.id; optional createAdCreative(accountId)→ creative.id (or reuse an existing creative via a select); createAdSet(campaign.id, {targeting}); createAd(adSet.id, {creativeId,destinationUrl}). Targeting is inline via TargetingForm = the "audience".
- Two finish actions reuse the SAME model as the standalone pages: "Save draft" (leaves everything draft) and "Publish now" (updateAdCampaign+updateAdSet active, submitAdForReview) — identical to campaigns.tsx `publishCampaign`.
- The old separate pages (Campaigns tab, campaign-detail, adset-detail, creatives, audiences) are KEPT for advanced/piecemeal editing; the wizard is the fast path, not a replacement.

## Ads-dashboard UI language = English
- All user-facing strings in the ads-dashboard artifact (toasts, empty states, dialog copy, labels, confirm dialogs) are ENGLISH, not Banglish. The user explicitly asked to convert everything on ads.himewo.com to English. Keep new UI copy in English.
- Chat replies to this user stay Banglish; only the shipped UI is English.
