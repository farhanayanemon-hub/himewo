---
name: HiMewo CI/CD — GitHub Actions auto-deploy
description: The web app now auto-deploys to Cloudflare Pages via GitHub Actions on every push to main. This replaces the broken /tmp local-build-and-deploy flow.
---

# HiMewo web deploys via GitHub Actions (not local wrangler)

`.github/workflows/deploy.yml` in the himewo repo builds `@workspace/web` and deploys to the Cloudflare Pages project `himewo` (→ himewo.com) on every push to `main` (and via `workflow_dispatch`). It runs on GitHub's ubuntu runners, so it **completely sidesteps the Replit `/tmp` install deadlock + mid-session wipe** (see `himewo-tmp-build-instability.md`). This is the canonical way to deploy now.

**Why:** local `pnpm install`/build is impossible from this environment; CI build on GitHub's infra is reliable. The user consented to storing the deploy credentials as GitHub repo secrets.

**What's configured (already done, durable):**
- GitHub **Actions repo secrets** set via `gh secret set` (gh CLI is installed; handles libsodium encryption): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The three `VITE_` ones are needed at BUILD time (baked into the bundle).
- Workflow build env: `NODE_ENV=production`, `BASE_PATH=/`, plus the three `VITE_` secrets; build cmd `pnpm --filter @workspace/web run build`; deploy cmd `npx wrangler@latest pages deploy artifacts/web/dist/public --project-name=himewo --branch=main`.
- Repo uses `packageManager: pnpm@10.26.1` (pnpm/action-setup auto-detects it). Node 24.

**How to apply / operate:**
- To deploy: just push to `main` (source push via GitHub API — see `himewo-github-push.md`). The Action builds + deploys automatically. No local build needed.
- Watch a run: `GH_TOKEN=$GITHUB_TOKEN gh run list --repo farhanayanemon-hub/himewo --workflow=deploy.yml` then `gh run view <id>`.
- Reading/writing repo files from this env: use `gh api` (gh CLI authed via `GH_TOKEN=$GITHUB_TOKEN`) — no clone needed, dodges `/tmp`.

## Token scope gotcha
Creating/updating any file under `.github/workflows/` via the API requires the PAT to have the **`workflow`** scope, not just `repo`. With only `repo`, the Contents API returns a confusing **404** (not 403) on workflow paths, while writes to normal paths succeed. The himewo `GITHUB_TOKEN` secret now has `repo, workflow`. If workflow edits start 404ing again, the token was rotated without `workflow` scope.

## Setting GitHub Actions secrets from this env (no value ever printed)
`gh` CLI is at `/nix/store/.../bin/gh`. Secrets are readable in **bash** as env vars (e.g. `$CLOUDFLARE_API_TOKEN`) even though the code_execution sandbox strips `process.env` and `viewEnvVars` only returns booleans for secrets. Set them with: `printf '%s' "$VAR" | GH_TOKEN=$GITHUB_TOKEN gh secret set VAR --repo farhanayanemon-hub/himewo`. Never echo the value.
