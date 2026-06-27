---
name: HiMewo /tmp build instability
description: Why building/deploying the himewo web app from a fresh /tmp clone is unreliable, and what works instead.
---

# HiMewo: building from /tmp is unreliable

The himewo repo is worked on from a fresh `/tmp/himewo` clone each session. Two hard problems observed:

1. **/tmp can be wiped MID-session**, not just between sessions. A whole clone (and its in-progress edits) disappeared partway through a build attempt. Edits living only in `/tmp` are at risk.
2. **A full `pnpm install` across the 10-package workspace deadlocks in the linking phase** on this filesystem. The store (`node_modules/.pnpm`) populates fully (~1144 pkgs), but creating the per-package `node_modules` trees hangs with **zero filesystem activity** — confirmed via `find -newermt '-60 seconds'` returning 0 and 0 linked packages in `artifacts/*/node_modules`. Both the default linker and `--config.node-linker=hoisted` deadlocked identically.

**Why:** likely an overlayfs hardlink issue on `/tmp`. Not a "slow, will finish" situation — it is a true hang.

**How to apply:**
- **Push source changes immediately** after editing, via the GitHub Git Data API (see `himewo-github-push.md`). This does NOT touch local `node_modules` and protects work against `/tmp` wipes. Pushing to `main` does NOT redeploy the live site (Cloudflare is wrangler direct-upload), so pushing source is safe.
- Do NOT assume you can `pnpm install` + `vite build` + `wrangler deploy` from `/tmp` in one session — the install step is the blocker.
- `pkill -9 -f "pnpm install"` from the bash tool returns exit 137 and can kill the calling shell; the detached `setsid` install also respawns/persists. Killing is messy — avoid relying on it.
- To actually rebuild/redeploy the live web app, a stable environment with a working `node_modules` is required. When `/tmp` install deadlocks, the deliverable is "source pushed to GitHub, deploy pending a working build env."
