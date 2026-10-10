---
name: Username system
description: FB-style username/display-name rename cooldowns, himewo.com/username links, case-insensitive uniqueness rules
---

# Username system

- Cooldowns: username 30 days, display name 60 days. `usernameChangedAt` / `displayNameChangedAt` on profiles start NULL → the first change after signup is always free. Set only on a real user-initiated change (no-op same-value PATCH must not touch them).
- **Why:** user asked for FB-parity rename locks with the first change free.
- Canonical username rules live in ONE place: `artifacts/api-server/src/lib/username.ts` (pattern, normalize, reserved list, unique-violation check). Every write path (signup `/auth/sync` AND rename `PATCH /users/me`) must go through it — architect failed the first version because sync inserted raw mixed-case usernames.
- Uniqueness is case-insensitive, enforced 3 ways: app-level `lower(username)=` check, DB unique index `profiles_username_lower_idx` on `lower(username)` (applied to BOTH dev + live), and a 23505 catch → 409 for the concurrent race. Lookups (`/users/by-username/:username`) must compare with `lower()` too.
- Signup collisions never fail: `/auth/sync` auto-falls-back to `base<digits>` variants when the requested name is taken/reserved/empty.
- Reserved usernames = top-level web routes (himewo.com/<username> is a catch-all `<Route path="/:username">` placed LAST before NotFound in web App.tsx; it looks up then redirects to `/profile/{id}`). Adding a new top-level web route ⇒ add it to the reserved list in username.ts.
- Cooldown timestamps are owner-only in the serializer (`toProfile` includeContact gate) — don't leak them to other viewers.
