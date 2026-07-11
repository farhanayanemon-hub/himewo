---
name: Stories & reels privacy enforcement
description: How story/reel audience gating works in the API and the easy-to-miss leak paths that must all be gated.
---

# Stories & reels privacy enforcement

Posts were already enforced (`canViewPost`/`filterVisiblePosts`). Stories and reels
enforcement lives in `lib/authz.ts` (`filterVisibleStories`/`canViewStory`,
`filterVisibleReels`/`canViewReel`, shared `loadAudienceContext`).

## Rules
- **Reels have NO per-reel audience column.** Visibility is purely the author's
  effective profile audience → `canViewReel` just delegates to
  `canViewProfileDetails`. Do NOT invent a reel audience field (out of scope).
- **Stories combine two layers**: author effective profile audience (lock +
  profileVisibility) AND the story's own `audience` col ("public"|"friends"|
  "private"). Story audience uses "private"; profile audience uses "only_me" — map
  accordingly.
- **Page stories are public** (`pageId != null` bypasses friend/lock gating — pages
  have no friend graph).
- **Story viewers LIST (`GET /stories/:id/views`) is author-only** (FB/IG norm), not
  merely canViewStory — gate `story.authorId === req.userId`.

## Leak vectors — gate EVERY read + interaction path, not just feed+get
It is easy to enforce the feed and the direct GET and still leak via side routes.
The ones that bit us (all fixed): `GET /stories/:id/views`, story view/reaction/
reply routes, `GET /reels/:id/comments`, and the DELETE reel like/reaction routes
(they return the built reel payload → must 404 via `canViewReel(built.author.id)`).
`buildStoryById` returns null when `!canViewStory`; `buildSavedItems` re-checks
saved reels via `canViewReel` (mirrors the existing saved-post re-check).

**Why:** direct-id access + interaction endpoints bypass the feed filter. A code
review specifically caught the three side routes above after the feed was already
gated — always audit views/comments/delete-response paths too.

## Filtered reels feed must batch-scan
`GET /reels` filters AFTER the SQL limit, so a single limited query can return a
short page while older visible reels still exist (client treats short page = end of
feed). Batch-scan (SCAN_BATCH=50, MAX_SCANS=8) until a full page — same pattern as
`routes/watch.ts`. See memory `himewo-watch-feed`.
