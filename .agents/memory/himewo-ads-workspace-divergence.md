---
name: Ads workspace vs GitHub divergence
description: The Replit workspace is an ads-only monorepo with its OWN git history, unrelated to the full farhanayanemon-hub/himewo GitHub repo. Never blanket-push one over the other.
---

# Ads workspace ⧸ GitHub divergence

The Replit **workspace** (`/home/runner/workspace`) and the **GitHub repo**
`farhanayanemon-hub/himewo` are two DIFFERENT trees with unrelated git history
(different commit SHAs; the workspace remote is only Replit-internal, not GitHub).

- **Workspace** = ads-only monorepo: `artifacts/{ads-dashboard, api-server, mockup-sandbox}`.
  Its root `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `tsconfig.json`
  describe ONLY these packages. No social-app code lives here.
- **GitHub `himewo`** = the FULL combined repo that builds the LIVE product:
  `artifacts/{mobile, mobile-chat, web, admin, ads-dashboard, api-server, mockup-sandbox}`.

**Why this matters (danger):** a blanket REST push of the workspace onto the GitHub
repo would overwrite the root config files (package.json, pnpm-lock.yaml,
pnpm-workspace.yaml, tsconfig.json, .replit, replit.md) with the ads-only versions.
Those omit the social-app packages, so Railway's frozen `pnpm install` and the
CF Pages / tsc builds for the live social app (himewo.com, himewo-mobile,
himewo-chat, admin) would break.

**How to apply:**
- NEVER blanket-push the workspace to `farhanayanemon-hub/himewo`. If ads code must
  reach GitHub, push ONLY the specific `artifacts/ads-dashboard/**` (and/or
  `artifacts/api-server/**`) files via the additive-tree REST method, and NEVER the
  root config files, unless you have first reconciled both trees.
- `ads-mobile` (Expo) was never on GitHub and was deleted from the workspace at the
  user's request: **Ads Insights is web-only.** Do not recreate a mobile ads app.
- The GitHub `artifacts/api-server` is the FULL product server and is FAR ahead of
  the workspace copy: its `analytics.ts` (~22KB) already does live-schema joins
  (`join ad_sets s on s.id=a.ad_set_id`, `join ad_campaigns c on c.id=s.campaign_id`,
  drizzle `sql` style), and its `index.ts` wires `initRealtime(server)` for the
  social websockets. Production already reads live data correctly. So the
  workspace's simpler api-server files (`index.ts`, `lib/analytics.ts`, and the
  `lib/live-db.ts` Railway-URL shim) are DEV-ONLY conveniences. NEVER push them to
  GitHub — doing so downgrades analytics and DELETES realtime, breaking live
  video/chat. There is nothing to deploy for a "workspace matches production" change.
- Live surfaces confirmed up (HTTP 200): himewo.com, admin.himewo.com,
  himewo-mobile.pages.dev, himewo-chat.pages.dev, api.himewo.com/api/healthz,
  himewo-ads.pages.dev, ads.himewo.com.

## The ads-dashboard ALSO diverges (not just api-server)

The **workspace** `ads-dashboard` is a stripped-down SINGLE-page app: title "Ads
Insights", `App.tsx` routes only `/` → one `Insights.tsx` (capital-I) that imports
`@/lib/formatters`. The **GitHub/live** `ads-dashboard` is the full multi-page
"HiMewo Ads Manager": auth + `DashboardLayout` sidebar + pages
campaigns/campaign-detail/adset-detail/accounts/audiences/creatives/team/wallet/
settings/insights, using `@/lib/money` (`formatCents`) & `@/lib/format`, NOT
`formatters`. The live insights page is the LOWERCASE `pages/insights.tsx`
(default export `InsightsPage`, uses `useGetAdAccountInsights`).

**Consequences / rules:**
- `ads.himewo.com` serves the GitHub app, built by `.github/workflows/deploy-ads.yml`
  which checks out GitHub `main` — NOT this workspace. So editing a workspace file
  and pushing it verbatim to GitHub can inject an incompatible file. (A "cleaner
  number font" edit to workspace `Insights.tsx` was pushed to GitHub as a NEW
  capital `Insights.tsx` that nobody imports — dead code; it imports non-existent
  `@/lib/formatters`, a build landmine. It was later deleted.)
- **To change the live ads UI: fetch the real GitHub file, edit THAT, push it back.**
  Do not assume workspace paths/imports match.
- **App-preview screenshots show the WORKSPACE app, not the live app.** They are not
  proof of what `ads.himewo.com` renders.
- The live app's `/` is CampaignsPage; sidebar NAV in `dashboard-layout.tsx` lists
  Campaigns/Insights/Audiences/Creatives/Team/Wallet/Settings. Every NAV `href`
  MUST have a matching `<Route>` in `App.tsx` or the link renders NotFound ("Page
  not found"). The Insights link (`/insights`) was missing its route — that was the
  404 bug; fixed by adding `<Route path="/insights" component={InsightsPage} />`.
