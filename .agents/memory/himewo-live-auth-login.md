---
name: HiMewo live login failures (auth + DB drift)
description: Why live login silently fails ("stays on login screen") and the two root causes to check first.
---

# Live login "stays on same screen" — two independent root causes

When users report login does nothing / stays on the login screen on the LIVE
backend (Railway + Supabase project `rzdfgbfyhnkvqbcegguk`), check these two
before touching client code. Both are server/data side, not the app.

## 1. Email confirmation enabled but no SMTP
- Supabase auth `mailer_autoconfirm` was `false` and **no custom SMTP** was set,
  so confirmation emails never reach gmail (built-in mailer is rate-limited).
  Signups stayed unconfirmed → `signUp` returns no session → the app's
  `signUpWithEmail` silently does nothing (no message), and sign-in on an
  unconfirmed account fails.
- **Fix:** PATCH Management API `/v1/projects/{ref}/config/auth`
  `{"mailer_autoconfirm": true}`, then confirm existing unconfirmed users via
  admin API `PUT /auth/v1/admin/users/{id}` `{"email_confirm": true}`.
- **Why:** non-technical owner can't set up SMTP; autoconfirm makes signup→login
  instant. Tradeoff: no email verification (easier fake accounts) — acceptable
  for now; revisit if abuse appears.

## 2. Live DB schema drift → `/api/auth/me` 500 → ALL logins fail
- `GET /api/auth/me` ran `buildProfileDetail`, whose `select().from(profilesTable)`
  references every column in the Drizzle schema. The LIVE `profiles` table was
  missing columns the schema already had (`birthday, education, hometown,
  hobbies, interests, website`) → Postgres "column does not exist" → 500.
  `ensureProfile` only handles 404/401/403, so a 500 throws a raw error and the
  user never leaves login.
- **Fix:** additive migration on live (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`),
  NOT `drizzle-kit push`.
- **CRITICAL — never blind `drizzle push` to live:** the live `profiles` table
  also has admin/moderation columns (`is_banned, is_suspended, role,
  suspended_until`) that are NOT in `lib/db/src/schema/profiles.ts`. A push would
  DROP them (data loss). Schema and live DB have diverged in BOTH directions.
- **How to verify drift:** Management API SQL
  `POST /v1/projects/{ref}/database/query` against
  `information_schema.columns` and compare with the Drizzle schema. Same class of
  bug can hide in other tables/endpoints.

## 3. Missing `saved_items` table → `/api/feed` AND `/api/reels` 500
- `buildPosts`/`buildReels` (serialize.ts) ALWAYS query `saved_items`
  (viewer's saved entityIds) inside a `Promise.all`. The live DB was missing the
  `saved_items` table entirely → every feed/reel request threw "Failed query:
  select entity_id from saved_items" → 500. Feed/reels render nothing on live.
- This 500 is independent of how much content exists — even 1 post 500s. Symptom
  looks like "posts/reels don't show on live" with no client error.
- **Fix:** additive create of `saved_items` on live (id serial PK, user_id uuid
  FK→profiles ON DELETE CASCADE, entity_type text, entity_id integer, created_at
  timestamptz default now, + unique idx (user_id,entity_type,entity_id) + idx
  (user_id,created_at)) — schema in `lib/db/src/schema/saved.ts`. Use
  `CREATE TABLE IF NOT EXISTS` via Management API SQL, never drizzle push.
- **Lesson:** the live DB has missing TABLES too, not just missing columns —
  any table referenced unconditionally in a serializer (saved_items, post_media,
  etc.) must exist on live or the whole endpoint 500s.

## Reproducing the live flow safely (no user password needed)
Use SERVICE_ROLE_KEY to create an auto-confirmed temp user → sign in via anon key
(`/auth/v1/token?grant_type=password`) to get a token → call live
`$VITE_API_URL/api/auth/me` (and `/api/auth/sync` with body `{id, username,
displayName, email}`) → delete the profile row + auth user to clean up. The local
api-server rejects real Supabase tokens (401) in dev, so test auth against LIVE.
