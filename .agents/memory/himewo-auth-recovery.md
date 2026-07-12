---
name: Auth recovery (login/forgot/find-account)
description: Design decisions for identifier login, OTP password reset, and the public find-account endpoint.
---

# Auth recovery flows

## Public find-account endpoint
- `POST /auth/find-account` is PUBLIC and returns a masked preview (displayName, avatar, masked email/phone). Enumeration is an accepted FB-style tradeoff, guarded by throttles.
- **Rate limiting rule:** never key a limiter on the FIRST `x-forwarded-for` hop — it is client-supplied and spoofable. Use the RIGHTMOST hop (appended by the trusted edge) AND a second throttle keyed on the identifier itself.
- **Why:** architect review failed the first version for exactly this; leftmost-XFF keying let a client rotate fake IPs and enumerate accounts.
- Limiter is in-memory — fine while the API runs as a single Railway instance; needs a shared store if scaled out.

## Identifier login + phone normalization
- Login form takes one identifier field: `isPhoneLike` (no "@", digits/spaces/dashes) → `normalizePhone` → `signInWithPassword({phone})`, else email. Helpers duplicated web (`components/auth-recovery.tsx`) and mobile (`lib/phone.ts`).
- BD normalization: `0…` → `+880…`, `00…` → `+…`, bare digits → `+digits`. Server-side find-account matches phone on stripped digits with the same BD candidate.

## OTP reset state machine (web + mobile identical)
- Reset OTP senders use `signInWithOtp({ shouldCreateUser: false })` so no account is ever created by a reset attempt.
- While the flow is open, `setWizardActive(true)` suppresses the auth provider's auto-login redirect so the user can set the new password first.
- Abandon-after-OTP = legit login (OTP proved ownership) → cleanup calls `refreshUser()`, never signOut.
- Mobile flows are in-screen state machines inside `(auth)/login.tsx` — deliberately NO new route files (typed-routes Href regeneration gotcha).
- Phone-OTP reset depends on a Supabase SMS provider being configured; email OTP works out of the box.
