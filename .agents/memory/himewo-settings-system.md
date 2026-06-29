---
name: HiMewo Settings system
description: Where per-user settings/preferences live and how they are enforced across the API + web + mobile.
---

# HiMewo Settings system

Per-user settings (privacy + notification + language preferences) are a self-contained
area, intentionally kept separate from the profiles schema/contract (which another task owns).

- DB: `lib/db/src/schema/settings.ts` (`user_settings`, PK = userId → profiles). Exported via `schema/index.ts`.
- Contract: OpenAPI `settings` tag, `GET/PATCH /settings` → `UserSettings` / `UserSettingsUpdate`.
- Route: `artifacts/api-server/src/routes/settings.ts`. Get-or-create on GET/PATCH (select → insert `onConflictDoNothing` → re-select). Always scoped to `req.userId` (each user reads/writes only their own row).
- Web: hub `pages/settings.tsx` + flat sub-pages `pages/settings-*.tsx`, shared shell `components/settings/settings-shell.tsx`, routes `/settings/*` in `App.tsx`.
- Mobile: hub `app/settings.tsx` + nested `app/settings/*.tsx` (expo-router allows a file + same-named folder), shared `components/settings/SettingsUI.tsx`.
- Change-password uses `supabase.auth.updateUser({ password })` on both clients.

**Notification preferences enforcement** lives in `artifacts/api-server/src/lib/notify.ts`'s
`createNotification` (the single choke point all routes call), NOT in each route.
`PREF_BY_TYPE` maps only reaction→notifyLikes, comment→notifyComments,
friend_request→notifyFriendRequests, message→notifyMessages. Other notification types are
always delivered (no toggle). Missing settings row = defaults (all enabled).
**Why:** one place to gate keeps every route consistent and avoids per-route drift.

**Profile lock (`isLocked`, Facebook-style)** — when on, non-friends/non-owners see no
posts/photos/intro/friends. Enforcement choke points:
- `canViewPost` (authz.ts) is the SINGLE post-visibility policy: blocks non-friends of a
  locked author; group posts exempt (governed by membership). Every post-returning read path
  MUST route through it — incl. indirect ones. `/saved` was the sneaky bypass: saved post IDs
  were re-served without re-checking, so `buildSavedItems` now filters loaded post rows through
  `canViewPost` at READ time, and `POST /saved` rejects saving a post you can't see.
- **Intro leak rule:** `toProfile(row, includeContact=false, includeIntro=false)` strips intro
  (bio/birthday/location/work/education/hometown/hobbies/interests/website) BY DEFAULT. Only
  `buildProfileDetail` passes `includeIntro=true` for authorized viewers. **Why:** dozens of
  endpoints embed author profiles (reactions/reels/stories/feed/search/lists); defaulting to
  no-intro closes the whole leak class at one point instead of per-route. No client reads intro
  from embedded authors — only profile-detail/edit/own-user pages (all via buildProfileDetail).
- `buildListProfiles(rows)` only attaches the `isLocked` flag now (intro already gone by default).
- `/users/:id/posts` and `/users/:id/friends` return `[]` for unauthorized viewers (see Privacy
  settings enforcement below for how `/feed` now gates per-post via `filterVisiblePosts`).

**Privacy settings enforcement** — the three privacy settings are enforced server-side (so web +
mobile inherit it) via shared `authz.ts` resolvers; key decisions worth keeping:
- `profileVisibility` and the `isLocked` lock toggle OVERLAP, so they are collapsed into one
  effective audience (`getProfileAudience`): `only_me`=owner-only, `friends`=friends-only, lock
  implies `friends`. **Why:** one resolver behind every profile/timeline read avoids per-route
  drift and keeps the lock-leak guard and visibility rule identical.
- `postVisibility` is a DEFAULT for NEW posts, NOT a read filter — applied at create only when the
  client omits `privacy` and it's not a group/page post (`only_me`→post privacy `private`). Both web
  and mobile composers now have a per-post picker; the picker prefills from `postVisibility` (map
  `only_me`→`private`). Don't treat `postVisibility` as a visibility gate on reads.
- **Composer prefill race (regression we hit):** the web composer fetches `postVisibility` async via
  `useGetMySettings`, so it must NOT hardcode-send `privacy:public` before settings load — that would
  silently over-share for users whose default is `friends`/`only_me`. Rule: only send explicit
  `privacy` when the user touched the picker OR settings have loaded; otherwise OMIT it and let the
  server apply the default. **Why:** the safe fallback is server-side defaulting, never client `public`.
- **Feed gotcha (regression we hit):** the feed SQL is only a coarse net (`public OR self/friend
  authored`); it must STILL run every row through the shared post-visibility policy
  (`filterVisiblePosts`, the batch twin of `canViewPost`). Filtering only non-friend authors leaks a
  friend's `only_me`/`private` posts. Any multi-post read path must use `filterVisiblePosts`, never
  ad-hoc author filtering.
- `friendRequestPrivacy=friends_of_friends` requires a mutual friend (or already-friends); enforced
  as a 403 at request-send. No client field was added, so both clients only learn via the 403.
