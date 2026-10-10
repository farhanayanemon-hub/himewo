---
name: HiMewo Admin panel — separate Cloudflare Pages deploy
description: The admin web app deploys to its own Pages project via its own GitHub Action, distinct from the public web app.
---

# Admin panel deploys separately from the public web app

The admin panel (`artifacts/admin`, `@workspace/admin`) is a standalone static
React app (wouter + tanstack-query + tailwind v4). It deploys to its **own**
Cloudflare Pages project **`himewo-admin`** (live at
`https://himewo-admin.pages.dev`), intended for the custom domain
`admin.himewo.com`. This is NOT the same project as the public site (`himewo`).

**CI:** `.github/workflows/deploy-admin.yml` builds + deploys on push to `main`
touching `artifacts/admin/**` or `lib/**`, plus `workflow_dispatch`. It reuses
the **same** repo secrets as the web deploy (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`, `VITE_API_URL`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) — no new secrets. Same Supabase project, same API
origin, fully-open CORS so no backend change for the new origin.

## Gotcha: `wrangler pages deploy` does NOT auto-create the project
First deploy failed with `Project not found ... [code: 8000007]`. `wrangler
pages deploy --project-name=X` errors instead of creating a missing project.
**Fix:** run `wrangler pages project create himewo-admin --production-branch=main
|| true` as a step BEFORE the deploy step (idempotent via `|| true`). Also pass
`--commit-dirty=true` to the deploy to silence the dirty-working-dir warning.

## Custom domain admin.himewo.com — set up via Cloudflare API (done)
The himewo.com zone is on Cloudflare DNS in the **same** account as the Pages
project, so the custom domain was added programmatically (no dashboard needed):
- `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` are available as Replit
  bash env vars (not just GitHub secrets).
- `POST /accounts/{acct}/pages/projects/himewo-admin/domains {"name":"admin.himewo.com"}`
- **Gotcha:** adding a Pages custom domain does NOT auto-create the DNS record
  (the zone's dns_records stayed empty, domain stuck "pending"). You must create
  the proxied CNAME yourself: `POST /zones/{zone}/dns_records
  {"type":"CNAME","name":"admin","content":"himewo-admin.pages.dev","proxied":true}`.
- After the CNAME exists it shows HTTP 522 for a few minutes (transient) while
  Cloudflare provisions the edge cert, then goes live automatically.

## Supabase Auth — only needed for OAuth/magic-link, not email+password
Adding the admin origin to Supabase → Auth → Redirect URLs is only required if
admins sign in via Google/magic-link. Plain email+password (password grant)
works without it. `SUPABASE_ACCESS_TOKEN` (Management API) is NOT in this env,
so this can't be automated — only `SUPABASE_SERVICE_ROLE_KEY` is present, which
can't edit Auth URL config.

## Access gating
App calls `GET /api/admin/me` after Supabase login; only PANEL_ROLES
(admin/moderator/support) pass, others get an access-denied screen. Per-page UI
is gated by the permissions array from that endpoint.

## Live Supabase admin schema + Management API (applied 2026-06-27)
- The admin DB migration (user_role/report_status/etc enums; profiles.role/is_suspended/suspended_until/is_banned; tables reports, audit_logs, feature_flags, site_settings, announcements, verification_requests, role_permissions) was applied DIRECTLY to LIVE Supabase (project ref rzdfgbfyhnkvqbcegguk) via the Management API. The external repo has NO .sql migrations and the backend has NO startup migration — schema lives only in lib/db/src/schema/*.ts, so live DDL must be applied manually.
- **Supabase Management API requires a User-Agent header.** `POST https://api.supabase.com/v1/projects/<ref>/database/query` with body {"query": "..."} and `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`. urllib WITHOUT a UA header gets 403 (WAF block); add `User-Agent: curl/8.0` (or use curl) and it returns 200/201. Token is account-wide: `/v1/projects` lists ALL projects incl. ayragpt + HiMewo.
- Admin role is granted by a `profiles` row with `role='admin'` keyed on the Supabase Auth user id. Backend `/api/admin/*` gate = requireAuth + requirePanel (checks profiles.role). `/api/admin/me` returns role+permissions.

## Railway api-server deploy blocked by stale lockfile (Task #7)
- **Symptom:** every `/api/admin/*` on api.himewo.com returns 404 even though admin routes are on main (commit added artifacts/admin + routes/admin/*). Live backend is an OLDER build.
- **Root cause:** the commit that added the `artifacts/admin` workspace package did NOT regenerate `pnpm-lock.yaml` — the lockfile has no `artifacts/admin` importer. Railway's `pnpm install --frozen-lockfile` then fails, so Railway keeps serving the previous successful build and never deploys the admin code.
- **Fix:** regenerate pnpm-lock.yaml (`pnpm install --lockfile-only`) so it includes artifacts/admin, push to main, and ensure Railway redeploys. Caveat: himewo is the EXTERNAL repo (not the local skeleton) and full install/clone deadlocks here — needs a lockfile-only path or Railway dashboard access. No railway/nixpacks config file exists in the repo (Railway config is dashboard-side).

## RESOLVED (2026-06-27): Railway admin deploy fixed
Two stacked blockers had to be fixed before /api/admin/* went live:
1. **Lockfile pnpm-version mismatch.** Railway railpack uses **pnpm 9.15.9**
   (picked from lockfileVersion 9). Regenerating pnpm-lock.yaml with pnpm 10.x
   produced an `overrides` snapshot that pnpm 9 frozen-install rejects
   (`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH ... overrides`). **Always regenerate this
   repo's lockfile with `corepack pnpm@9.15.9 install --lockfile-only
   --ignore-scripts`**, not the default pnpm.
2. **Missing direct `zod` dep.** Admin routes import `from "zod/v4"` directly,
   but `artifacts/api-server/package.json` did not declare `zod`. pnpm strict
   node_modules → esbuild bundle "Could not resolve zod/v4". Fix: add
   `"zod": "catalog:"` (catalog = ^3.25.76, ships the /v4 subpath) to api-server
   dependencies, then regenerate lockfile. Older non-admin routes used
   `@workspace/api-zod` so the gap never surfaced before.

After both: deploy SUCCESS, `GET /api/admin/me` → 200 with role=admin + full
permissions; users/reports/announcements/settings/roles endpoints 200.

## RECURRED (2026-06-30): admin BACKEND lost in interleaving, only frontends were restored
- **Symptom:** `/api/admin/me` → 404 (not 401) on live; admin.himewo.com login
  can't establish a session after Supabase sign-in. `/api/auth/me` = 401 (so the
  API is up; only admin routes are gone). 404 on `/api/admin/*` = routes not in the
  running build (see also stale-lockfile case above).
- **Root cause:** the interleaving merge that wholesale-replaced main's tree
  deleted the api-server admin code (`routes/admin/*`, `lib/admin-auth|admin-serialize|audit|flags`,
  `routes/reports.ts`) AND the governance DB schema (`lib/db/src/schema/admin.ts` +
  the moderation columns/enums added to enums/profiles/content/posts/communities).
  The later restore commit only brought back the `artifacts/web` + `artifacts/admin`
  FRONTENDS — it never restored the api-server backend or lib/db schema. So the panel
  shipped but its backend gate endpoint was missing for weeks.
- **Where the originals live in history:** backend routes/libs = commit `4baa5af`
  (`feat(admin): /api/admin/* suite`); DB schema = commit `f5af7c6`
  (`Admin: add roles, moderation flags, governance tables`). Restore the purely-additive
  files verbatim via `git show <sha>:<path> > <path>`, then MERGE (don't overwrite)
  the additive bits into the current enums/profiles/content/posts/communities and
  re-add the two router `import`/`router.use` lines to `routes/index.ts`.
- **Live-DB drift trap (critical):** the 2026-06-27 admin migration applied the
  governance TABLES + profiles role/is_banned/is_suspended/suspended_until to live,
  but NOT the per-content moderation columns (posts.hidden/pinned/featured,
  comments.hidden, reels.hidden/featured, stories.hidden, groups/pages.featured/is_approved)
  nor notification_type 'announcement'/'verification'. Restoring those columns into the
  Drizzle schema makes `select().from(...)` request them, so they MUST be backfilled on
  live first (additive `ALTER TABLE ADD COLUMN IF NOT EXISTS` + `ALTER TYPE ADD VALUE
  IF NOT EXISTS` via Management API) or feed/reels/posts 500. Always diff
  information_schema.columns vs the restored schema before deploying.
- **Deploy note:** these are api-server files so the push auto-deploys (watchPattern
  matches) — no manual serviceInstanceDeploy needed. Verify with the temp-user e2e:
  create auto-confirmed user → sign in → /admin/me=403 → `update profiles set role='admin'`
  → /admin/me=200 with permissions → delete user.

## TWO admin auth systems — they disagree (2026-06-30)
- The codebase has **two separate admin guards** and they grant access differently:
  1. `requirePermission(...)` / `requireAdmin*` in `lib/admin-auth.ts` — checks the
     DB `profiles.role` + `role_permissions` (this is what the admin panel grants).
  2. `requireAdmin` in `lib/auth.ts` — checks `isAdminUser()` = the `ADMIN_USER_IDS`
     **env allowlist** (dev convenience: in non-prod with empty allowlist, ALL users
     pass; in prod, only listed IDs pass). The **earnings** routes (`earnings-admin.ts`,
     paths `/api/admin/earnings/*`) use THIS one.
- **Symptom:** admin panel Earnings tab → 403 Forbidden even for a role=admin user,
  because their UUID isn't in ADMIN_USER_IDS. **Fix applied:** `requireAdmin` in
  `lib/auth.ts` now also passes when `profiles.role === 'admin'` (env allowlist OR DB
  role). If you add new admin-panel features, prefer the `admin-auth` permission guard
  so they honor panel-granted roles, not the env allowlist.

## Live posts table drift: comments_enabled / reactions_enabled (2026-06-30)
- Admin Content→Posts tab → 500. Cause: live `posts` was missing `comments_enabled`
  and `reactions_enabled` (both `notNull` in the Drizzle schema), so the admin
  `db.select()` (all columns) failed. Inserts/feed never broke because they pass
  explicit column lists, but `select()` pulls every schema column → "column does not
  exist". Live also has a `shared_post_id` column NOT in the schema (reverse drift).
  Fix: additive `ALTER TABLE posts ADD COLUMN IF NOT EXISTS ... boolean NOT NULL
  DEFAULT true` via Management API. **Lesson:** any admin route using `db.select()`
  (no column projection) is a tripwire for schema↔live drift — diff
  information_schema.columns against the table schema whenever one 500s.

## Railway deploy mechanics (via RAILWAY_TOKEN)
- GraphQL `https://backboard.railway.app/graphql/v2`, headers `Authorization:
  Bearer $RAILWAY_TOKEN` + a `User-Agent`.
- Trigger: mutation `serviceInstanceDeploy(serviceId, environmentId)` (uses
  latest main commit). Poll: `deployment(id){status}`; logs:
  `buildLogs(deploymentId, limit){message severity}`.
- IDs: project b1a0ad33-a4b3-4522-ae51-b036d6c891e1, service (@workspace/api-server)
  7e88b9c9-8548-46a5-a736-034448eccffb, env production ee90bb4c-d8f2-4a68-8c11-6351393174b1.
- builder RAILPACK; build `pnpm --filter @workspace/api-server build`;
  watchPatterns `/artifacts/api-server/**` (root-only commits do NOT auto-deploy).

## GitHub API gotcha: huge blobs
`gh api -X POST .../git/blobs -f content=<base64>` with a ~500KB lockfile fails
`Argument list too long` and can leave an EMPTY blob in the tree (broke main's
lockfile once). **Use `gh api ... --input <jsonfile>`** (Contents API PUT with a
JSON body file) for large files instead of inline `-f`.

## Railway lockfile + manual-deploy race (api-server)
Frozen install fails two ways: (1) ERR_PNPM_OUTDATED_LOCKFILE if the repo lockfile
is missing deps that exist in a package.json; (2) ERR_PNPM_LOCKFILE_CONFIG_MISMATCH
(autoInstallPeers) if you regenerate the lockfile WITHOUT the repo `.npmrc`. **Fix:**
regen in an isolated /tmp dir that CONTAINS the repo `.npmrc`, with the matching pnpm:
`corepack pnpm@9.15.9 install --lockfile-only --ignore-scripts` → yields
`autoInstallPeers: false` to match Railway's derived config. Lockfile lives at repo
root, which does NOT match watchPattern `/artifacts/api-server/**`, so a lockfile-only
push is SKIPPED (no auto-deploy) — you must trigger `serviceInstanceDeploy` manually.
**Race:** firing the manual deploy in the same breath as the push builds the PREVIOUS
HEAD (Railway hasn't synced the new commit yet) → it rebuilds the stale/bad lockfile
and fails identically. Wait until `git/ref/heads/main` confirms your SHA is HEAD AND
Railway has synced, then trigger; verify the route with `curl api.himewo.com/api/<x>`
(401 = deployed behind requireAuth, 404 = not deployed).
