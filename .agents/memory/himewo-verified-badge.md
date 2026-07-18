---
name: Verified badge request flow
description: User-facing blue-badge apply flow, its duplicate legacy endpoint, and the one-pending-per-user DB guard.
---

# Verified badge request flow

User-facing flow: `GET/POST /api/verification/request` (routes/verification.ts,
requireAuth) → admin queue in routes/admin/verification.ts approves and flips
`profiles.isVerified`. Web page `/verified` + sidebar shortcut; mobile screen
`/verified` + menu shortcut. Clients use the RAW-fetch pattern (like calls.ts),
NOT Orval codegen — deliberate, to avoid OpenAPI churn for a tiny surface.

**Gotchas / rules:**
- There is a LEGACY duplicate submission path `POST /verification-requests` +
  `GET /verification-requests/me` in routes/reports.ts (no client uses it, but
  it may be in the OpenAPI contract — don't delete blindly; keep its policy
  aligned with the new route: already-verified users get 400).
- One-pending-per-user is enforced by a **partial unique index**
  `verification_requests_one_pending_idx on (user_id) where status='pending'`
  (in drizzle schema AND applied to live DB). The route's pre-check is
  advisory; catch pg `23505` → 409 for double-submit races.
- **Why:** read-then-insert alone let two concurrent submits both create
  pending rows; also the first version only checked the LATEST row's status,
  which misses an older pending row.
- New top-level route `/verified` is in the reserved-username list (standing
  rule for any new top-level web route).

**FB-style eligibility (admin-configurable):** rules live in site settings
(`verification_min_account_age_days`=15, `verification_min_posts`=15,
`verification_min_reels`=5, `verification_regular_post_days`=7 (0=off),
`verification_monthly_fee`=299tk display-only — NO billing wired). Shared
logic in api-server/src/lib/verification.ts; enforced server-side in BOTH
submission routes; GET returns requirements/progress/eligible/missing and
clients gate the submit button on server `eligible`. Admin Panel → Settings
has the editing card. Settings values parse STRICTLY (`^\d+---
name: Verified badge request flow
description: User-facing blue-badge apply flow, its duplicate legacy endpoint, and the one-pending-per-user DB guard.
---

# Verified badge request flow

User-facing flow: `GET/POST /api/verification/request` (routes/verification.ts,
requireAuth) → admin queue in routes/admin/verification.ts approves and flips
`profiles.isVerified`. Web page `/verified` + sidebar shortcut; mobile screen
`/verified` + menu shortcut. Clients use the RAW-fetch pattern (like calls.ts),
NOT Orval codegen — deliberate, to avoid OpenAPI churn for a tiny surface.

**Gotchas / rules:**
- There is a LEGACY duplicate submission path `POST /verification-requests` +
  `GET /verification-requests/me` in routes/reports.ts (no client uses it, but
  it may be in the OpenAPI contract — don't delete blindly; keep its policy
  aligned with the new route: already-verified users get 400).
- One-pending-per-user is enforced by a **partial unique index**
  `verification_requests_one_pending_idx on (user_id) where status='pending'`
  (in drizzle schema AND applied to live DB). The route's pre-check is
  advisory; catch pg `23505` → 409 for double-submit races.
- **Why:** read-then-insert alone let two concurrent submits both create
  pending rows; also the first version only checked the LATEST row's status,
  which misses an older pending row.
 else default).
Counts include all authored posts/reels (hidden/moderated not excluded —
open product question).

**Notifications:** type "verification" (already in enum) with entityType
discriminator: verification_pending (self-notify on submit, both routes),
verification_approved / verification_rejected (admin PATCH — actorId
deliberately omitted so the reviewing admin isn't exposed). All 3 clients
(web, mobile, chat) map these entityTypes to text/icon; web+mobile navigate
to /verified. Older rows may have plain entityType "verification" → generic
"was reviewed" fallback.
