---
name: Landing Page App Version & Download Sync
description: User requires that whenever apps are updated, the version numbers and download links on the landing page (app.himewo.com) must ALWAYS be updated automatically.
---

# Landing Page App Version & Download Sync

## User Rule (Critical)
Whenever an update, build, or release is made to either of the two mobile apps:
- **HiMewo Social App** (`artifacts/mobile`)
- **HiMewo Chat Messenger** (`artifacts/mobile-chat`)

You must **ALWAYS update the version number and download link** on the Landing Page:
1. `artifacts/api-server/src/routes/app-landing.ts` (the backend config default / DB setting).
2. `artifacts/app-landing/src/App.tsx` (the frontend fallback default config).
3. If publishing a GitHub release, ensure the release tag and asset name align with the version shown on the landing page (`app.himewo.com`).
