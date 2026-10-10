---
name: Ads Insights live-DB connection
description: How the workspace Insights app reads the LIVE production ads DB without storing the credential, plus the live-vs-dev schema difference.
---

# Ads Insights → LIVE production database

## Credential is resolved at runtime, never stored
The live Supabase connection string is NOT a workspace secret (and the agent
cannot set secrets). Instead the API server resolves it at startup from Railway's
GraphQL API using the existing `RAILWAY_TOKEN`, discovers the service by name
(not hardcoded IDs — they change), and overrides `process.env.DATABASE_URL` for
the running process only. On any failure it logs a warning and keeps the local
dev DB; `ADS_DB_SOURCE=dev` forces dev.
- **Why:** keeps the live credential out of the repo and out of workspace
  secrets, and leaves `drizzle-kit`/`db push` pointed at the dev DB so a schema
  push can never mutate live.
- **How to apply:** the env override MUST happen before the db module is first
  imported (the pg pool opens at import time) — hence an async bootstrap in
  `index.ts` that sets env, THEN dynamically imports the app.

## Railway GraphQL gotchas
- The discovery query is brace-sensitive: a single missing `}` returns
  `GRAPHQL_PARSE_FAILED` with undefined data, which silently looks like "service
  not found" → dev fallback. Verify `data.projects` is present before trusting a
  "not found" result.
- `RAILWAY_TOKEN` can read `projects`/`variables` but `me` returns Not
  Authorized — expected, not a broken token.

## LIVE schema differs from dev — join required
- Live event tables carry only `ad_id` + `account_id` (NOT denormalized with
  campaign_id/ad_set_id like dev). So insights reach campaign/ad-set by joining
  the ad → ad_set chain (campaign table is `ad_campaigns`; `ads` has no
  campaign_id). 1:1 PK joins keep COUNT/SUM/COUNT(DISTINCT) exact; the same join
  query is also correct against the dev DB.
- Live data is currently EMPTY, so insights legitimately show zeros — expected,
  not a bug.
