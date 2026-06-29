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
