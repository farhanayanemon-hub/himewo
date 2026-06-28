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

**Still NOT enforced (deferred):** `profileVisibility` / `postVisibility` /
`friendRequestPrivacy` are persisted but not yet applied in read/write flows (feed, profile,
posts, friend-request) — that enforcement touches many routes and overlaps Profile/Feed tasks.
