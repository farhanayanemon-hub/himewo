---
name: HiMewo mobile preview web links
description: The two mobile Expo apps are mirrored as standalone web builds on Cloudflare Pages so they can be viewed in any browser. Where they live + how to rebuild.
---

# HiMewo mobile apps — preview web links

The two Expo mobile apps cannot both be previewed inside Replit at once (they share one
Expo dev domain, pinned to the social app). So each is also exported as a **web build** and
hosted standalone on Cloudflare Pages — **preview/viewing only**, not the real native app.

## Live URLs
- **Social main app** (`artifacts/mobile`, orange theme) → https://himewo-mobile.pages.dev
- **Messenger / Chat** (`artifacts/mobile-chat`, blue theme) → https://himewo-chat.pages.dev

Both are SPAs that talk to the LIVE backend (api.himewo.com + Supabase), so login works.

## How to rebuild & redeploy
Per app: `expo export --platform web` then push the output to its Cloudflare Pages project.
- Run the export from the app dir with the SAME env the `dev` script maps:
  `EXPO_PUBLIC_DOMAIN` (= VITE_API_URL host, scheme stripped), `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REPL_ID`. Output to `/tmp/dep-<app>`.
- Deploy from `/tmp` (outside repo): `npx wrangler pages deploy /tmp/dep-<app> --project-name=<proj> --branch=main --commit-dirty=true`.
  Projects: social = `himewo-mobile`, chat = `himewo-chat`. CF token/account secrets work.
- For a standalone root deploy, app.json must NOT set `experiments.baseUrl` (root paths needed).

## Build gotcha (OOM) — important
**Why:** the web export is memory-heavy. The social app build exceeds the 120s bash limit;
killing it mid-build leaves an orphan metro/node process that eats RAM until even tiny
commands (`pkill`, `free`) get OOM-killed (exit 137/143).
**How to apply:**
- Build ONE app at a time; the smaller chat app fits in 120s foreground.
- For the bigger social build, free RAM first: kill node/metro with a **pure-bash builtin loop**
  (fork-free, survives OOM): iterate `/proc/[0-9]*`, read `cmdline`, `kill -9` matches of
  `node`/`metro`. (`pkill` forks and gets OOM-killed itself.) This also stops the two expo
  workflows — restart them (`restart_workflow`) after the build. Warm metro cache makes the
  2nd export much faster.
