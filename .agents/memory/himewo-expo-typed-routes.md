---
name: Expo typed routes regeneration
description: Why mobile typecheck fails with a "not assignable to Href" error after adding a new screen file, and how to fix it.
---

# Expo typed routes are generated, not live

When you add a NEW route file under `artifacts/mobile/app/` (e.g. `app/saved.tsx`) and
then reference it with `router.push("/saved")` or an `Href`, `pnpm --filter
@workspace/mobile run typecheck` fails with something like:

`error TS2322: Type '"/saved"' is not assignable to type 'RelativePathString | ... 142 more ...'`

**Why:** Expo Router's typed-route union lives in the generated file
`artifacts/mobile/.expo/types/router.d.ts`. It is only regenerated when Metro
(the Expo dev server) runs — it does NOT update just because you created the file,
and `tsc` reads the stale union.

**How to apply:** Regenerate by briefly starting Expo, then re-run typecheck:
```
cd artifacts/mobile && timeout 45 sh -c 'PORT=18115 REACT_NATIVE_PACKAGER_HOSTNAME=localhost pnpm exec expo start --localhost --port 18115 >/tmp/expo.log 2>&1 & sleep 35'
```
After ~30s the new path appears in `.expo/types/router.d.ts`. Do NOT hand-edit that
generated file. `expo customize` is interactive and useless for this. Avoid `pkill -f "expo start"` in the same bash call you care about — it can kill the agent's own shell (exit 143); the timeout already stops it.
