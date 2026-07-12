---
name: Post-signup onboarding flow
description: How the one-time onboarding (photo/cover/bio/5 friend requests) is gated and the invariants that keep legacy users out of it.
---

# Post-signup onboarding (web + mobile)

- Gate is `user.hasCompletedOnboarding === false` (explicit false ONLY). The field is nullable and serialized owner-only (includeContact); null/undefined must never trigger the flow — non-owner payloads and legacy clients would otherwise get trapped.
- **Why:** `profiles.onboarding_completed_at` was backfilled to `now()` on BOTH dev and live when the column shipped, so only genuinely new signups (NULL at insert) ever see onboarding. Any future reset for testing = set the column NULL for that user.
- `POST /users/me/onboarding-complete` is idempotent (`WHERE onboarding_completed_at IS NULL`); skipping through the flow still calls it so it never re-shows.
- `/users/suggestions?mode=onboarding` = random w/ same-country CASE preference, excludes friends + pending both directions; conditional orderBy array (a literal `ORDER BY 0` is invalid postgres).
- Mobile: rendered as an absolute-fill overlay ABOVE the Stack in RootNavigator (router stays mounted) — deliberately NOT a route, avoiding the typed-routes regen gotcha.
- Client flow: friends step goal = min(5, suggestions.length); Finish disabled until goal met but Skip always available. Done step dismisses via `refreshUser()` (auth context user, not react-query cache, drives the gate).
