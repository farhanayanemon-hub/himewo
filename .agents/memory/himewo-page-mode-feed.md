---
name: Page-mode home feed
description: Acting-as-page home feed becomes a public feed (all public posts) instead of the personal friends feed.
---

# Page-mode home feed

When a user "acts as" a page they own/manage, the home feed switches to a
Facebook-style public feed (ALL public posts by anyone), not the personal
friends feed.

- Contract: `GET /feed` has an optional `pageId` query param.
- Server gates it with `canManagePage(viewer, pageId)` (owner via
  `pages.createdBy` OR a `page_members` row). Unmanaged/invalid pageId silently
  falls back to the personal feed — safe because page mode only ever exposes
  `privacy='public'` posts.
- **Why the fallback is not an escalation:** page mode SQL filters to
  `privacy='public'` only, then STILL runs `filterVisiblePosts` (author lock /
  profileVisibility / per-post privacy). No private content can leak.

## Pagination gotcha (same as watch feed)
`filterVisiblePosts` drops rows AFTER the SQL limit, so a single limited query
can return a short page while older visible posts still exist — clients treat a
short page as end-of-feed. `/feed` MUST batch-scan (SCAN_BATCH loop, desc id)
until it collects a full page or runs out. Client cursor stays "last visible
post id" — continuing from there is complete (already-scanned filtered rows have
larger ids and are never revisited).

## Clients
- Web `home.tsx`: pass `pageId` when `actingPage` set; include it in the
  `useGetFeed` params AND `getGetFeedQueryKey`; reset accumulated `pages`/cursor
  in an effect keyed on `actingPage?.id`.
- Mobile `(tabs)/index.tsx`: add `actingPage?.id ?? null` to the infinite query
  key and spread `{ pageId }` into `getFeed`.
