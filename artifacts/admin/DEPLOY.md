# Deploying the HiMewo Admin Panel (admin.himewo.com)

The admin panel (`@workspace/admin`) is a standalone static React app that talks
to the same HiMewo API and Supabase project as the main web/mobile apps. It
deploys to its **own** Cloudflare Pages project, separate from the public site.

## Automatic deploys (CI)

`.github/workflows/deploy-admin.yml` builds and deploys on every push to `main`
that touches `artifacts/admin/**` (or `lib/**`), and via manual
`workflow_dispatch`. It runs on GitHub's runners — no local build needed.

- Build: `pnpm --filter @workspace/admin run build` with
  `NODE_ENV=production`, `BASE_PATH=/`, and the `VITE_*` secrets baked in.
- Deploy: `wrangler pages deploy artifacts/admin/dist --project-name=himewo-admin --branch=main`.

### Required GitHub Actions secrets

These are the **same** repo secrets the web deploy already uses — no new secrets
are required:

- `CLOUDFLARE_API_TOKEN` (Pages:Edit), `CLOUDFLARE_ACCOUNT_ID`
- `VITE_API_URL` — the API origin, e.g. `https://api.himewo.com` (scheme is
  auto-added if missing, but include it to be safe)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The first CI run creates the `himewo-admin` Pages project automatically
(`wrangler pages deploy` creates it when missing). It will be live at
`https://himewo-admin.pages.dev` before the custom domain is attached.

## One-time manual setup (requires dashboard access) — ACTION NEEDED

These steps cannot be automated from CI and must be done once by an owner:

1. **Custom domain** — In Cloudflare → Pages → `himewo-admin` → Custom domains,
   add `admin.himewo.com`. Cloudflare creates the DNS `CNAME` automatically when
   the zone is on Cloudflare. (If DNS is elsewhere, add a `CNAME` for
   `admin` → `himewo-admin.pages.dev`.)
2. **Supabase Auth URLs** — In Supabase → Authentication → URL Configuration,
   add `https://admin.himewo.com` (and `https://himewo-admin.pages.dev`) to the
   allowed **Redirect URLs** so admin login works.
3. No backend/CORS change needed — the API uses fully-open CORS and Bearer-token
   auth (not cookies).

## Access control

The app itself is gated: after Supabase login it calls `GET /api/admin/me`. Only
users whose role is in `PANEL_ROLES` (admin / moderator / support) get in;
everyone else sees an "access denied" screen. Per-page features are further gated
by the permissions returned from `/api/admin/me`.
