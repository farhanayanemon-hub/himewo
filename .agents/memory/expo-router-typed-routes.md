---
name: expo-router typed routes strictness
description: Why `tsc --noEmit` can pass before the Expo dev server runs and fail after, for router Href usage.
---

# expo-router typed routes can pass tsc before the dev server, fail after

`expo-router` generates a typed-routes declaration (under `.expo/types`) only when
the Metro/dev server runs. Before that file exists, `Href` and `router.push(...)`
arguments type-check loosely, so `tsc --noEmit` can pass even when a screen links
to a route that does not exist (e.g. `/saved`, `/groups`). After the dev server
runs once and regenerates the typed routes, the same `router.push("/saved")` becomes
a hard TS2322 error because the route is not in the generated union.

**Why:** the route union is derived from the actual files in `app/`, generated at
dev-server start, not at typecheck time.

**How to apply:** after wiring navigation in an Expo app, restart the expo workflow
once and re-run `npx tsc --noEmit` — only then are dead links to non-existent routes
caught. Every `href`/`router.push` target must correspond to a real file in `app/`,
or typecheck will fail once routes are generated.
