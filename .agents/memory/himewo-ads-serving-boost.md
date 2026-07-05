---
name: Ads serving + boost layer
description: HiMewo ad serving (/ads/serve), impression/click tracking, and lightweight Boost post/page — the non-obvious rules that bit us.
---

# Ads serving + boost (feed sponsored cards)

Builds on the ads backend foundation (see himewo-ads-system.md). Adds admin approve/reject,
`/ads/serve` (returns approved ads), impression+click tracking, and a lightweight Boost flow.

## Feed impression tracking MUST be viewability-based, never on-mount
- **Rule:** record an impression only when the sponsored card is actually visible — web uses
  IntersectionObserver (`threshold: 0.5` + a once-flag); mobile uses FlatList
  `onViewableItemsChanged` + `viewabilityConfig={itemVisiblePercentThreshold:50}`, deduped via a
  `seenAds` Set ref, firing from the FEED (not the card).
- **Why:** a first mobile pass fired the impression in the card's `useEffect` on mount. FlatList
  mounts rows offscreen (windowing/pre-render) → impressions logged for never-seen ads →
  systematic overcounting. Code review caught it.
- **How to apply:** any new sponsored surface (reels, marketplace) must gate impressions on real
  viewability. onViewableItemsChanged/viewabilityConfig must be STABLE refs (`useRef(...).current`)
  or RN throws "Changing onViewableItemsChanged on the fly is not supported"; keep the live
  mutate fn in a ref so the stable callback always calls the current one.

## Route ordering: /ads/serve before /ads/:id
- The literal `/ads/serve` route MUST be registered before the `/ads/:id` param route, or Express
  matches `:id="serve"` and the serve endpoint is shadowed (silently 404/400s). This bit us once.

## Boost gating (privacy)
- Boost post: caller must be owner AND `post.privacy === "public"` (no boosting friends-only/private).
- Boost page: caller must be the page owner. Boost is intentionally lightweight (budget cents ≥100,
  days 1–30, optional headline/CTA/destinationUrl) — NOT a full campaign builder (out of scope).
- All user-supplied URLs (destinationUrl, creative linkUrl, mediaUrls) http(s)-guarded both sides.

## Live DB
- Boosting adds `boosted_post_id` / `boosted_page_id` (integer, nullable) to the `ads` table. Apply
  to live Supabase additively (`ALTER TABLE ads ADD COLUMN IF NOT EXISTS ...`) via the Management
  API — NEVER drizzle-push live. Dev DB already has them.
