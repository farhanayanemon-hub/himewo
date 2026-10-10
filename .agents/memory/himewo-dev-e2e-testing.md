---
name: Dev-environment e2e testing setup
description: How to run browser e2e tests against HiMewo dev surfaces (auth bypass, dev DB, Expo domain contention).
---

# Dev e2e testing (HiMewo)

**Why:** the workspace's `VITE_API_URL` points at PRODUCTION (`api.himewo.com`). Untouched, dev browsers hit prod (which rejects `dev:` tokens → 401) and tests would pollute live data.

**How to apply:**
- All web clients (web/admin/ads) now use relative `/api` URLs in dev (`import.meta.env.DEV`-gated) — the shared proxy on `localhost:80` / `$REPLIT_DEV_DOMAIN` routes `/api` to the local API server.
- Dev login: set localStorage `himewo_dev_user_id` (admin panel: `himewo_admin_dev_user_id`) to a seeded UUID (`00000000-0000-4000-8000-00000000000{1..8}`), reload. Token getters fall through to `Bearer dev:<uuid>` when Supabase has no session — every fall-through and auth-listener guard MUST stay `import.meta.env.DEV`-gated (prod parity; a null-session event must always clear the user in prod).
- Dev DB can be found EMPTY (fresh) — then `pnpm --filter @workspace/db run push-force` + `pnpm --filter @workspace/api-server run seed`. Admin access in dev: set `profiles.role='admin'` for the test user.
- Expo apps: both mobile + chat share ONE `$REPLIT_EXPO_DEV_DOMAIN`; ownership is flaky when both run. Reliable path: open the app's Metro port DIRECTLY on localhost (ports are dynamic — `ps aux | grep "expo start"`). Their dev scripts derive config from `VITE_*` vars, so a testing-subagent workflow restart with overrides `VITE_API_URL=https://$REPLIT_DEV_DOMAIN`, `VITE_SUPABASE_URL=""`, `VITE_SUPABASE_ANON_KEY=""` forces the Development Login screen + local API.
- Chat composer: Enter does NOT send (multiline input); send = purple paper-plane button, smiley icon opens the emoji sheet (testers mistake it for a broken "hearts picker").
- Story viewer opens at an older story; newest story appears after advancing within the person — not a bug.
