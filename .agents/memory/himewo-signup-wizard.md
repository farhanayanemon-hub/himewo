---
name: Signup wizard (web + mobile)
description: Multi-step FB-style signup wizard design — mid-wizard Supabase session lifecycle, abandon cleanup, geo/country data. Read before touching signup/auth flows.
---

# Signup wizard — durable design decisions

## Mid-wizard session lifecycle (the core invariant)
- OTP verification (email `verifyOtp` / phone) creates a REAL Supabase session **before** the profile exists — `/api/auth/me` 404s until the wizard's final `syncProfile` call.
- A `wizardActive` ref in both auth libs suppresses the normal onAuthStateChange fallback sync while the wizard runs; the done screen calls `refreshUser()` → redirect.
- **Abandon guard:** if the wizard unmounts with `sessionCreated && !completed`, it must `signOut()` — otherwise the user is stuck in a half-account limbo (session, no profile). This was an architect-flagged bug; keep the guard when refactoring.
- Restart-limbo (app relaunch mid-wizard) is recovered by the onAuthStateChange fallback profile sync since wizardActive is gone.

## Wizard field flow
- Profile fields first_name/last_name/gender/country are text cols on `profiles` (dev + live applied); auth sync endpoint accepts them all at completion.
- Password is set AFTER OTP verification (Supabase updateUser) so email/phone + password login works later.

## Country data + geo
- Full country dataset (name/flag/dial code) is **duplicated**: `artifacts/web/src/lib/countries.ts` and `artifacts/mobile/constants/countries.ts` (DEFAULT_COUNTRY=BD). Edit both together.
- `GET /api/geo` detects country from request IP for the email path (no country picker there); private-IP 172.x check is correctly narrowed to 172.16-31.

## Mobile specifics
- Mobile wizard uses RN built-in Animated (reanimated not wired — see himewo-reanimated-not-wired.md); country picker + month picker are plain Modals.
