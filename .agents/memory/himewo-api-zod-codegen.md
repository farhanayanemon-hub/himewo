---
name: HiMewo api-zod codegen ambiguity
description: Adding an OpenAPI endpoint with BOTH path params and query params needs a manual re-export in lib/api-zod/src/index.ts or codegen typecheck fails.
---

# api-zod path+query endpoints need a manual disambiguation re-export

When you add an endpoint that has both path params AND query params (e.g.
`getPagePosts` = `/pages/{id}/posts` with `id` + `cursor`/`limit`), orval emits
a `<Name>Params` in BOTH `lib/api-zod/src/generated/api.ts` (the zod query
schema) and `lib/api-zod/src/generated/types/index.ts` (the TS path-param type).
`lib/api-zod/src/index.ts` does `export * from` both, so the collision fails
`typecheck:libs` with TS2308 ("already exported a member named '<Name>Params'").

**Fix:** add `<Name>Params` to the explicit `export { ... } from "./generated/api"`
block near the bottom of `lib/api-zod/src/index.ts` (the zod query schema wins,
since the server validates query params at runtime). Existing precedent there:
`GetGroupPostsParams`, `GetUserPostsParams`, `ListCommentsParams`, etc.

**Why:** codegen (`pnpm --filter @workspace/api-spec run codegen`) runs orval
then `tsc --build`; without the manual re-export the build step aborts and the
whole codegen command exits non-zero.

**How to apply:** any new path+query OpenAPI route → after codegen, if libs
typecheck complains about an ambiguous `*Params`, append it to that re-export list
and re-run codegen.
