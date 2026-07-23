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

## `pnpm add` while an expo workflow is running crashes Metro with ENOENT `_tmp_*` watch
Adding a dep (even a web-only one) re-links the pnpm store; Metro's file watcher walks
`node_modules/.pnpm` and dies on transient/orphaned `..._tmp_<n>` dirs:
`Error: ENOENT ... watch '.../<pkg>_tmp_772'` → expo exit status 7.
- **Why:** pnpm creates temp rename dirs during install; Metro watch races them, and some are
  left orphaned so the negative watch survives a restart.
- **How to apply:** after any install, before restarting expo:
  `find node_modules/.pnpm -maxdepth 4 -name "*_tmp_*" | xargs -r rm -rf` then clear metro cache
  (`rm -rf /tmp/metro-* /tmp/haste-* ~/.expo`) and restart the expo workflow. Do installs with
  expo stopped when possible.

## /tmp/logs/*.log is a STALE snapshot — call refresh_all_logs for current state
Reading `/tmp/logs/<workflow>_<ts>.log` with bash/read shows the state captured at the LAST
`refresh_all_logs` call, not live output. After a restart, `ls -t` may return the SAME old
file and show an error that is already resolved.
- **How to apply:** to judge current workflow state, call `refresh_all_logs` (it writes fresh
  files), then read the newest path it reports. Don't trust an old `/tmp/logs` file after a restart.
