---
name: Metro resolution cache + stale log snapshots
description: Two Replit/Expo env gotchas that waste time after codegen — Metro caching resolve failures, and /tmp/logs being a stale snapshot.
---

# Metro resolution cache + stale log snapshots

## Metro caches module-resolution FAILURES across a plain restart
After codegen writes previously-missing files (e.g. `lib/api-client-react/src/generated/api.ts`),
Metro can keep failing with `Unable to resolve "./generated/api"` even though the file now
exists — a `restart_workflow` alone does NOT fix it.
- **Why:** Metro persists its transform/haste map cache on disk; the negative resolution
  result survives a process restart.
- **How to apply:** delete the caches then restart the expo workflow:
  `rm -rf /tmp/metro-* /tmp/haste-* node_modules/.cache/metro artifacts/<app>/node_modules/.cache artifacts/<app>/.expo/cache`.
  A fresh bundle after that resolves the generated files (module count ticks up, no error).

## /tmp/logs/*.log is a STALE snapshot — call refresh_all_logs for current state
Reading `/tmp/logs/<workflow>_<ts>.log` with bash/read shows the state captured at the LAST
`refresh_all_logs` call, not live output. After a restart, `ls -t` may return the SAME old
file and show an error that is already resolved.
- **How to apply:** to judge current workflow state, call `refresh_all_logs` (it writes fresh
  files), then read the newest path it reports. Don't trust an old `/tmp/logs` file after a restart.
