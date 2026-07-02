---
name: Admin panel permission gating
description: How to gate a new admin page to admin-only by adding a frontend-only permission.
---

# Admin panel permission gating

The admin panel's `can(perm)` (in `artifacts/admin/src/lib/auth.tsx`) returns
`true` when `me.role === "admin"` OR when `perm` is in the user's granted
permission list. The granted list comes from the backend (`/admin/me`).

**Rule:** To add a new admin page that should be **admin-only**, add a new
permission (e.g. `earnings.view` / `earnings.manage`) to the frontend
`PERMISSIONS` union in `artifacts/admin/src/lib/types.ts`, then gate the nav
item (`Layout.tsx` NAV) and the route `<Guard perm=...>` (`App.tsx`) on it.

**Why:** The backend never grants that new permission to any role, so for
non-admins `can()` is false (hidden); for admins the `role === "admin"`
short-circuit makes it visible. This matches backend endpoints protected by
`requireAdmin` (admin role only) without inventing a backend permission.

**How to apply:** Use this when the backend route is `requireAdmin`. If
instead the backend grants a real permission per-role, the permission name in
the frontend must match what the backend returns in `/admin/me`, or the page
will be invisible to the intended non-admin roles.

## Real backend permission example: `messages.view` (admin Messages panel)

The admin "Messages" panel (view ANY user's conversations + full message
threads) uses a **real backend-granted** permission `messages.view`, not the
frontend-only trick above. It must be kept in lockstep in BOTH catalogs:
- backend `artifacts/api-server/src/lib/admin-auth.ts` `PERMISSIONS` array
  (admin auto-gets ALL via `effectivePermissions` returning `[...PERMISSIONS]`;
  also added to the `moderator` entry in `DEFAULT_ROLE_PERMISSIONS`).
- frontend `artifacts/admin/src/lib/types.ts` `PERMISSIONS` union.

**Why real (not frontend-only):** so moderators (not just admins) can moderate
DMs. Backend routes `GET /admin/users/:id/conversations` and
`GET /admin/conversations/:id/messages` (in `routes/admin/conversations.ts`) are
gated by `requirePermission("messages.view")`.
**Gotcha:** if a `role_permissions` DB override row exists for moderator, it
won't include `messages.view` until re-saved in the Roles page — admin always
has it regardless.
