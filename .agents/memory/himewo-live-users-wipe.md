---
name: Live user model + account wipe
description: Live prod DB user table naming, and the safe way to wipe all accounts (Supabase auth + DB).
---

# Live user model & full account wipe

- LIVE prod DB (Supabase Postgres, resolved via Railway vars of `@workspace/api-server`) has NO `users` table — the app user table is `public.profiles` (+ `auth.users` from Supabase auth). Dev DB uses `users`. Schema drift is real; never assume dev names on live.
- **Full account wipe method (user-consented, done Jul 2026):** delete every Supabase auth user via admin REST (`GET/DELETE {SUPABASE_URL}/auth/v1/admin/users` with SERVICE_ROLE key), then `TRUNCATE public.profiles CASCADE` on the live DB to drop leftover rows + all user content.
- **Why:** deleting auth users alone doesn't guarantee profile/content cleanup; truncate cascade guarantees a clean slate.
- Preview path note: web and ads-dashboard artifacts both claimed `/` → proxy 502 at root. Ads now lives at `/ads-manager` (artifact.toml previewPath/paths/BASE_PATH all changed together).
