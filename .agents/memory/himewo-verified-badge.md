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
