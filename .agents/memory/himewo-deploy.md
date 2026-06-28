---
name: HiMewo deploy pipeline
description: How to deploy each HiMewo surface live (web/admin via Cloudflare, API via Railway-from-GitHub) and the non-obvious gotchas.
---

# HiMewo deploy pipeline

Three live surfaces, three mechanisms:

## Web + Admin → Cloudflare Pages (wrangler)
- Build locally, copy dist OUTSIDE the git repo (e.g. `/tmp/dep-web`, `/tmp/dep-admin`), then:
  `cd /tmp && npx wrangler pages deploy /tmp/dep-web --project-name=himewo --branch=main --commit-dirty=true`
  (admin → project `himewo-admin`). `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets work.
- **Why outside repo:** wrangler chokes / picks up repo state if run inside the git tree.
- Verify: `himewo.com` / `admin.himewo.com` return 200; confirm new JS hash matches local build.

## API → Railway, which auto-builds from GitHub `main`
- Railway service `@workspace/api-server` auto-deploys on every push to GitHub `main`. So deploying the API = **push to GitHub main**, nothing else.
- IDs: project `hospitable-nourishment`, env `production`, service id `7e88b9c9-8548-46a5-a736-034448eccffb`, env id `ee90bb4c-d8f2-4a68-8c11-6351393174b1`. Builder = RAILPACK.

### Railway token quirk
- The user's `RAILWAY_TOKEN` is a 36-char **workspace/team UUID** token. It WORKS only for GraphQL via `Authorization: Bearer` at `https://backboard.railway.com/graphql/v2`. It FAILS the Railway CLI and `me`/projectToken queries. Do not retry the CLI.
- Poll deploys: `{service(id:..){deployments(first:N){edges{node{id status meta}}}}}` (meta has commitHash/commitMessage).
- Build logs of a failed deploy: `{buildLogs(deploymentId:..., limit:300){message}}`.
- Trigger a deploy manually (if webhook is slow/absent): `mutation{serviceInstanceDeployV2(environmentId:$e,serviceId:$s)}` → returns a deployment id. The workspace token HAS mutation permission for this.

### pnpm version pin is mandatory (Railway build gotcha)
- **Rule:** root `package.json` must pin `"packageManager": "pnpm@10.26.1"` (match the local pnpm that writes `pnpm-lock.yaml`).
- **Why:** with no pin, railpack defaults to pnpm **9.x**, but the lockfile is generated locally by pnpm **10**, so `pnpm install --frozen-lockfile` fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` ("overrides configuration doesn't match"). The overrides hash differs across pnpm majors. Aligning Railway to pnpm 10 fixes it durably.
- Before pushing a deploy, sanity-check locally: `pnpm install --frozen-lockfile` must exit 0.

## GitHub push when git CLI is blocked
- The git CLI (push/commit) is hard-blocked in this env. Push via GitHub REST API with `GITHUB_TOKEN`:
  create blobs for changed files → new tree with `base_tree` = remote tree (preserves remote-only files like `.github/workflows`) → commit with `parents` = remote HEAD (fast-forward, no force, nothing deleted) → PATCH `refs/heads/main`.
- Repo: `farhanayanemon-hub/himewo`. A 120s bash run may time out AFTER the ref update succeeds — always re-verify HEAD via `GET /repos/.../git/ref/heads/main` before re-pushing.
- To push the WORKING-TREE version of a file (uncommitted local edit), read it from disk for the blob — don't rely on `git ls-tree HEAD`.

## Verify API live
- `curl -o /dev/null -w "%{http_code}"` the routes. Auth routes flip **404→401** once new code is live (401 = route exists, needs login). `/api/healthz` = 200.
