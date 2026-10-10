---
name: Go-live checklist (user standing order)
description: After EVERY completed task, deploy everything live and report live status to the user. User explicitly requested this as a standing rule.
---

# Standing order: always go live after finishing work

**Why:** The user (July 12, 2026) explicitly instructed: after finishing any task, push to GitHub, update ALL live apps/sites, and always tell them whether everything live is up-to-date and OK. Never leave work dev-only without saying so.

**How to apply — ordered checklist:**
1. **Live DB first** (if schema changed): apply DDL via Supabase Mgmt API
   `POST https://api.supabase.com/v1/projects/<ref>/database/query` with `SUPABASE_ACCESS_TOKEN`
   (ref = host part of `VITE_SUPABASE_URL`). Idempotent DDL (IF NOT EXISTS). DDL must land BEFORE new API code.
2. **Sanity:** `pnpm install --frozen-lockfile` exits 0; `packageManager` pin intact.
3. **Push to GitHub main** via REST helper (`/tmp/ghpush.mjs` pattern — recreate if gone; batch-hash with
   `git hash-object --stdin-paths`, per-file exec is too slow and times out). Push auto-deploys:
   API (Railway) + web + admin + ads (GitHub Actions).
4. **Mobile web mirrors** (if either Expo app changed): chat first (fits 120s), then kill node/metro
   (pure-bash loop) → export social app → wrangler deploy both from /tmp → restart both expo workflows.
5. **Verify + REPORT to user every time:**
   - Railway newest deployment SUCCESS on the pushed commit (GraphQL).
   - GitHub Actions runs success on the pushed commit.
   - 200s: himewo.com, admin.himewo.com, ads.himewo.com, api.himewo.com/api/healthz,
     himewo-mobile.pages.dev, himewo-chat.pages.dev.
   - New auth routes flip 404→401 once live.
   Then explicitly tell the user: everything live is updated and OK (or what is not and why).
