---
name: HiMewo Chat ↔ live website connection
description: How the local artifacts/mobile chat app connects to the live himewo website backend, and the calls-route gap.
---

# Connecting the mobile chat app to the live himewo website

The "main website" is the external repo `farhanayanemon-hub/himewo` (public) — a full
Banglish social platform, **same monorepo shape** as this project (same api-server
routes, same OpenAPI, Supabase auth). This `artifacts/mobile` chat app was carved out
of that codebase.

**How connection works (runtime, no code change):** the app is fully env-driven. Set
three shared env vars so it points at the live deployment instead of dev mode:
- `EXPO_PUBLIC_DOMAIN` — the **API/backend** host only (no `https://`), i.e. the
  Railway backend serving `/api`, NOT the web frontend domain. Verify with
  `GET https://<domain>/api/healthz` → `{"status":"ok"}`.
- `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the website's Supabase
  project (Settings > API). Sharing the same Supabase project = shared real users +
  shared DB, so website users log in and conversations/messages sync.

When these are set, `lib/supabase.ts` flips `isSupabaseConfigured=true`; the login
screen shows real email/password/phone/Google instead of the dev-user picker. Restart
the `artifacts/mobile: expo` workflow after changing env so Expo re-bundles.

**Why dev tokens stop working once connected:** the live Railway backend runs
`NODE_ENV=production`, and `resolveUserId` only accepts `dev:<uuid>` when
`!env.isProduction`. So auth must go through Supabase.

**Login silent-bounce contract:** backend `GET /api/auth/me` returns **404** ("call
/auth/sync") when the profile row is missing, **401** when the Supabase JWT does not
verify. The mobile app must, after `signInWithPassword`/OTP/Google, fetch the profile
and on 404 create it via `POST /api/auth/sync` then refetch (self-heal); on 401/403
throw a visible error. Swallowing this error = user logs in but route guard never
redirects → bounced back to login screen with no message. A persistent 401 (even after
sync) means the app's Supabase project ≠ the project the backend verifies against
(backend `SUPABASE_URL`/JWKS) — **not fixable from the app**, only by aligning env.

**Cannot mint a test token locally:** the project has `mailer_autoconfirm:false` and
anonymous sign-ins disabled, and rejects `@example.com` emails — so new signups need
email confirmation. There is no Supabase service-role key in this repl, so end-to-end
auth verification requires a real confirmed user's credentials (ask the user to test).

**Calls gap:** the audio/video Stream token endpoint `GET /api/calls/token` exists only
on the LOCAL api-server — the himewo repo's `artifacts/api-server/src/routes/` has no
`calls.ts`. So when the app points at the live backend, calls fail (404 → token fetch
fails). To enable calls on the connected app, the calls route must be added to the
himewo backend and deployed to Railway, with `STREAM_API_KEY`/`STREAM_API_SECRET` set
there.
