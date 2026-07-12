---
name: HiMewo real-name validation
description: Signup name policy — validator lib, public validate endpoint contract, and the 3 enforcement points. Read before touching name/displayName flows.
---

# Real-name validation (signup names + displayName)

All name policy lives in ONE server lib: `artifacts/api-server/src/lib/nameValidation.ts`
(`validateNamePart` / `validateFullName` / `validateDisplayName`). Never duplicate rules client-side.

**Rules:** unicode letters only (Bangla OK) + space/hyphen/apostrophe/period, ≥2 letters per part,
≤50 chars, repeated-char (3+), Latin gibberish heuristics (vowel-less words ≥4, consonant runs ≥5,
keyboard runs asdf/jkl), EN + Bangla/Banglish profanity blocklists (both scripts), non-person
blocklist (brands/roles/places). "Md." / "Jean-Pierre" / Bangla-script names pass.

**Endpoint contract:** public (pre-session) `POST /auth/validate-name` ALWAYS returns 200 with
`{valid, firstNameError, lastNameError}` — rejection is NOT a 4xx. Wizards block Next on invalid.

**Enforcement (anti-bypass) — 3 points, all server-side:**
1. `/auth/sync` → 400 if a provided firstName/lastName is invalid. Validate ONLY the provided
   part(s) individually (partial updates must not require both fields).
2. `PATCH /users/me` displayName → validateDisplayName BEFORE rename-cooldown checks.
3. Wizard UX (web + mobile) calls validate-name on the name step — UX only, not the security layer.

**Why:** signup wizard runs pre-auth, so the check endpoint must be public; but sync/rename are the
real write paths and must independently reject, or the policy is trivially bypassable via direct API.
