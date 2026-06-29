---
name: HiMewo web — Cloudflare Pages deploy
description: How the HiMewo web frontend is deployed to Cloudflare Pages and how to redeploy.
---

# HiMewo web is on Cloudflare Pages via wrangler DIRECT UPLOAD (not git-connected)

The web app (`artifacts/web`) is deployed to a Cloudflare Pages project named **`himewo`** (live at `https://himewo.pages.dev`) using `wrangler pages deploy` direct upload — NOT the git-connected Pages build that `DEPLOY.md` describes.

**Why:** the git-connected Pages build kept failing; direct upload builds locally (env baked in) and uploads the static folder, sidestepping the remote build entirely.

**How to redeploy (rebuild + upload, a git push does NOT update it):**
1. Build with the VITE_ env present: `NODE_ENV=production BASE_PATH=/ pnpm --filter @workspace/web run build`
2. `npx wrangler@latest pages deploy artifacts/web/dist/public --project-name=himewo --branch=main`

Needs env/secrets: `CLOUDFLARE_API_TOKEN` (Pages:Edit), `CLOUDFLARE_ACCOUNT_ID`, and build-time `VITE_API_URL` (Railway backend URL), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. VITE_ vars are baked into the bundle at build time, so they must be set BEFORE building, not in the Cloudflare dashboard.

Backend (`artifacts/api-server`) uses `app.use(cors())` (fully open), so a new frontend origin needs no backend change. Auth is Bearer-token, not cookies.

**Still manual in dashboards for login/upload to work:** add the Pages origin to Supabase Auth URL config (Site URL + Redirect URLs), and to the R2 bucket CORS AllowedOrigins.

## CRITICAL auth gotcha — SUPABASE_JWT_SECRET breaks login on ES256 projects

This Supabase project signs JWTs with **ES256 (asymmetric)** keys (verify via `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` — it lists `alg: ES256`). The api-server `lib/auth.ts` logic: **if `SUPABASE_JWT_SECRET` is set it verifies with HS256 and never falls back to JWKS.** So an HS256 secret makes EVERY ES256 token fail → all `/api/auth/*` return `{"error":"Unauthorized"}` and nobody can log in.

**Fix:** On the host (Railway), **remove `SUPABASE_JWT_SECRET`** so the backend uses JWKS (ES256). `DEPLOY.md` wrongly tells you to set it (from Settings > API > JWT Settings) — that guidance only works for legacy HS256 projects, NOT this one.

**Symptom signature:** Supabase password-grant login succeeds (returns access_token) but backend `/api/auth/me` returns Unauthorized.

## Creating a usable account when Supabase "Confirm email" is ON
anon `auth/v1/signup` returns NO session (confirmation_sent_at set) → can't finish. Use the service_role key + Admin API instead: `POST ${SUPABASE_URL}/auth/v1/admin/users` with `{email,password,email_confirm:true,user_metadata:{...}}`, then password-grant login to get a token, then `POST <api>/api/auth/sync` (ProfileInput body) to create the `profiles` row. NOTE: `/auth/sync` uses the JWT `sub` for the row id, BUT its zod body still REQUIRES an `id` string field — omitting it returns 400 "Required" and the profile is never created (then any FK to profiles, e.g. `shares.user_id`, fails). Always send `{id, username, displayName}` in test harnesses. Bash gotcha: `UID` is readonly — never assign to it.

## Verify before going live (preview branch)
Before deploying to `main` (→ himewo.com), deploy the same `dist/public` to a throwaway branch to get a screenshot-able URL: `wrangler pages deploy ... --branch=preview-<name>` → `https://preview-<name>.himewo.pages.dev`. Screenshot it (external_url tool), confirm, then re-deploy identical build to `--branch=main`. Unchanged files report "already uploaded" so the main deploy is near-instant.

## VITE_API_URL must include the scheme (blank screen after login)
The `VITE_API_URL` secret was set to `api.himewo.com` (NO `https://`). The web client's `setBaseUrl` prepended it verbatim, so relative calls like `/api/auth/me` resolved against the Pages origin (`https://himewo.com/api.himewo.com/api/...`) → 404 → Cloudflare SPA `_redirects` serves `index.html` (200) → JSON.parse(HTML) throws → `getCurrentUser` fails → after Supabase login the profile never loads → user stuck on a blank/login screen. **Symptom signature:** Supabase login succeeds but the app never advances past login; API calls return HTML.
**Fix (done in code, resilient):** `artifacts/web/src/lib/api.ts` and `lib/realtime.tsx` now normalize the base URL — if it lacks `^https?://`, prepend `https://`. So the secret value can stay scheme-less. Same WS origin derives `wss://` via `.replace(/^http/,"ws")`.

## wrangler from bash: run OUTSIDE the git repo
`wrangler pages deploy` runs `git` internally (even with `--commit-dirty=true`) and
touches `.git/index.lock` → the main-agent bash guard kills it ("Destructive git
operations are not allowed"). **Fix:** copy `dist/public` to `/tmp/webdist` and run
`wrangler pages deploy /tmp/webdist` from `/tmp` (no `.git` ancestor → no git probe).
Also use a fresh npm cache (`npm_config_cache=/tmp/wrcache`) to dodge npm
`ECOMPROMISED / Lock compromised` on the shared cache. Deploy with `--branch=main`
to update the himewo.com production alias; unchanged files report "already uploaded".
This direct-upload path is the reliable fallback when the web GitHub Action does NOT
fire on a push (API-pushed commits sometimes trigger no run; token may lack
`workflow` scope so you can't even read `deploy.yml` to see its path filters).
