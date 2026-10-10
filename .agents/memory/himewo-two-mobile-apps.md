---
name: HiMewo has TWO separate mobile apps
description: There are two distinct Expo apps in artifacts/; how they differ and how the chat one went missing/was restored.
---

# Two mobile apps — do not confuse or delete either

- `artifacts/mobile` — **"HiMewo" main app** (full social: feed, stories, reactions, reports). app.json name "HiMewo". Registered previewPath `/mobile` (was `/` but that collided with web — see below).
- `artifacts/mobile-chat` — **"HiMewo Chat"** separate Messenger-style app (45 files). app.json name "HiMewo Chat", previewPath `/mobile-chat/`.

**Why it kept "going missing":** the chat app was committed only on branch `add-himewo-chat` (commit `61de7f7`) and **never merged to main**, so any fresh clone/sync from `main` lacks it. It was restored onto `main` (`git archive 61de7f7 artifacts/mobile-chat`).

**How to apply:** when verifying "all apps present", expect SIX artifacts: web, admin, api-server, mobile, mobile-chat, mockup-sandbox. The user is adamant nothing gets deleted; if mobile-chat is absent from main, recover it from `61de7f7`.

## previewPath collision (Replit registration)
Only ONE artifact may use previewPath `/`. In the original repo BOTH `web` and `mobile` claimed `/`, so `verifyAndReplaceArtifactToml` fails with `DUPLICATE_PREVIEW_PATH`. Resolution: `web` keeps `/` (it's himewo.com root), `mobile` moved to `/mobile` (BASE_PATH too). Mobile is Expo (expo-domain router) so previewPath is just a registration slot — production uses the Expo domain, nothing breaks.

## Adding a workspace package to main's lockfile without churn
Do NOT run `pnpm install --lockfile-only` on the Replit env to add one package — it prunes ~1300 lines of cross-platform optional binaries (darwin/win32/freebsd) vs main's lockfile. Instead **splice the importer block**: mobile-chat shares 100% of its deps with `artifacts/mobile` (already on main) at identical versions, so copy the `artifacts/mobile-chat:` importer block from `61de7f7`'s lockfile, verify every `version:` ref already exists in main's lockfile, and insert it alphabetically (before `artifacts/mockup-sandbox:`). No new package/snapshot entries needed.

## No CI on current main
`main` (as of restore commit 25d3f94) has **no `.github/` at all** — the `deploy.yml` GitHub Action described in `himewo-cicd-github-actions.md` is NOT on main. So a push to main does NOT auto-build/deploy; the live web deploy is manual wrangler direct-upload. Pushing an imperfect lockfile to main cannot break the live site.
