---
name: Signup country flags + block-list
description: Why signup flags are images (not emoji), and how the phone-signup country block-list is stored and enforced.
---

# Signup country flags + country access control

## Flags must be images, not emoji
Country flags in the signup pickers use `countryFlagUrl(code)` (→ flagcdn.com PNG),
NOT the old Unicode regional-indicator emoji (`countryFlag()`).
**Why:** regional-indicator emoji do NOT render on Windows browsers or Android — they
show the bare 2-letter code instead. flagcdn is free, no key: `https://flagcdn.com/w{width}/{code}.png`.
**How to apply:** any new country/flag UI must render an `<img>`/`<Image>` from
`countryFlagUrl`, never the emoji helper. Both web + mobile signup use this.

## "Unsupported" on some countries is NOT our bug
The "unsupported" error on phone signup comes from Supabase's SMS OTP provider
rejecting regions not enabled on the provider account (`signInWithOtp({ phone })`).
It is provider config, not app code. Do not hunt for it in the codebase.

## Country block-list (phone signups only)
- Stored in the existing `siteSettings` key-value table under key
  `blocked_signup_countries` = JSON string array of uppercase ISO codes. NO new
  table/migration; default `"[]"` lives in `SITE_SETTING_DEFAULTS` so reads work
  even with no DB row. `getBlockedSignupCountries()` parses defensively.
- Admin UI reuses generic `PUT /admin/settings/:key` + `settings.view`/`settings.manage`
  perms (no new permission, no role-catalog change). Public read via plain `fetch`
  to `GET /auth/signup-config` → `{ blockedCountries }` (no Orval/codegen churn).
- Web/mobile signup fetch that config and filter blocked countries out of the picker.

## Enforcement rule (the non-obvious part)
Enforced in `POST /auth/sync`. Gate = `bindingPhone` = `!!data.phone && !hadPhone`,
where `hadPhone` = profile already had a phone. So it fires on a NEW signup OR the
FIRST time a phone is bound to a phone-less account (closes "make email account then
bind blocked phone" bypass), but NEVER on a re-sync where the phone is unchanged — so
an existing phone user from a now-blocked country is never locked out of login.
**Country is derived from the VERIFIED phone's dial code**: `findCountry(data.country)`
must exist AND its `dialCode` must be a prefix of the E.164 phone, else 400. This
stops bypass via omitting/spoofing `country` (UI hiding is not a security control).
**Residual (accepted):** shared dial-code groups (e.g. +1 US/CA/Caribbean) can't be
disambiguated by number alone — blocking one +1 country is defeatable by claiming
another +1 ISO. Strict ISO blocking would need carrier/MCC lookup (not available).
