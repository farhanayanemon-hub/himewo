---
name: Generated query hooks require explicit queryKey
description: Orval-generated useX query hooks make queryKey REQUIRED when you pass a query options object; new consumer apps hit TS2741 without it.
---

# Generated query hook `queryKey` requirement

When calling an Orval-generated query hook from `@workspace/api-client-react`
with a `query` options object (e.g. to set `enabled`), the generated type makes
`queryKey` **required**, not optional. Omitting it fails typecheck with
TS2741 ("Property 'queryKey' is missing").

**Correct pattern (matches artifacts/web):**
`useX(id, { query: { enabled: cond, queryKey: getGetXQueryKey(id) } })`
For hooks with a params arg: `useX(id, {}, { query: { enabled, queryKey: getXQueryKey(id) } })`.

Every `get*QueryKey` fn is barrel-exported alongside its hook; import the one
matching the hook.

**Why:** this bit the ads-dashboard build — 15 TS2741 errors on first
typecheck. Any NEW consumer app (or new hook usage) that passes a `query`
options object must include the matching `queryKey`.

**How to apply:** when adding a page that gates a query with `enabled`, always
also pass `queryKey: get<HookName>QueryKey(...)` from the same import.
