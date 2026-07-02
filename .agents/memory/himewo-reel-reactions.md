---
name: Reel reactions & route-method drift
description: Reel reactions design (reel_likes.type) and the OpenAPI-vs-Express HTTP method mismatch class of bug.
---

# Reel reactions

- `reel_likes` gained a `type reaction_type NOT NULL DEFAULT 'like'` column (applied to LIVE DB via Supabase query API script — never drizzle-push to live).
- PUT/DELETE `/reels/{id}/reaction` mirror the comment reaction routes (upsert on `(reelId,userId)`, delete removes). Legacy like endpoints kept; `likeCount` = total reactions of any type; `viewerHasLiked` = any reaction present.
- DELETE reaction/like handlers must 404 when the reel is missing — `buildReelById` returns null and `Response.parse(null)` throws a 500 otherwise.

## Route-method drift bug class (important)

**Rule:** an Express route's HTTP method must match the OpenAPI spec's method — generated clients always use the spec's method.

**Why:** `/reels/{id}/like` was `put:` in the spec but `router.post` on the server, so every generated-client reel like silently failed (404) in production until reel reactions work exposed it. Typecheck/codegen cannot catch this — the method string never crosses the type system.

**How to apply:** when adding or reviewing any route, grep the spec for the path and confirm the verb matches the `router.<verb>` registration. If legacy clients might use another verb, register the same handler for both.
