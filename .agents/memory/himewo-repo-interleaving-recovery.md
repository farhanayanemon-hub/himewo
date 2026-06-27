---
name: HiMewo external-repo interleaving & recovery
description: How concurrent task agents merging into the same external himewo repo main silently delete files, and how to recover via Git Data API.
---

# Concurrent agents overwriting the shared external repo

Multiple agents (web, mobile, admin) push to the SAME external repo `github.com/farhanayanemon-hub/himewo` main. A task agent that branched from an OLD base and then had its tree merged can **replace main's tree wholesale**, silently deleting every file it didn't carry — even files other agents added minutes earlier.

**Why:** the merge took the agent's full tree as the new main tree, not a 3-way merge. Observed: an interleaving commit deleted the entire `artifacts/web/` directory (package.json, vite.config, index.html, all of `src/` App/components/ui) and left only the one file the in-flight agent happened to touch.

**Symptoms that point here:**
- `gh workflow list` → "no workflows found" and `.github/workflows/*` missing from the tree → CI workflow file was deleted by a merge; restore it (a local copy lived in `exports/deploy.yml`).
- Deploy "Build web" step shows `pnpm --filter @workspace/web` → **"0 modules transformed"** or "No projects matched the filters" yet **succeeds** (exit 0) → the web package's `package.json` is gone, so the filter matches nothing and builds nothing; wrangler then fails with `ENOENT ... dist/public`.
- `pnpm install --frozen-lockfile` → `ERR_PNPM_OUTDATED_LOCKFILE` after you restore a package.json → root `pnpm-lock.yaml` was regenerated without that package. Cannot regen lockfile locally (pnpm install deadlocks here), so set the CI install step to `--no-frozen-lockfile`.
- `pnpm/action-setup` → "No pnpm version is specified" → root `package.json` lost its `packageManager` field; pin `with: version:` in the workflow instead of depending on it.

**How to apply (recovery recipe):**
1. Find a last-good commit (a green deploy run's `headSha`). Fetch its tree: `gh api repos/.../git/trees/<good>?recursive=1`.
2. Diff against current main tree to see what's missing.
3. Restore via Git Data API in ONE atomic commit, reusing the good commit's blob SHAs (content already in the repo, no upload):
   - get current main HEAD + its tree sha (base_tree),
   - build tree entries `{path, mode, type:"blob", sha:<blobsha from good tree>}` for the missing files, **excluding any file you intentionally changed** (e.g. keep your new `auth.tsx`, restore everything else),
   - `POST git/trees` with `base_tree`, `POST git/commits` with parent=HEAD, `PATCH git/refs/heads/main`.
4. Push triggers the Actions deploy; verify live with a cache-busted fetch of the hashed JS bundle for your markers, then screenshot.

**Prevention:** keep concurrent agents on disjoint paths; treat any "successful" web deploy that transformed 0 modules as a failure.
