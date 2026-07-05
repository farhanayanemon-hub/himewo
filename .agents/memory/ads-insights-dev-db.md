---
name: Ads Insights dev DB & drizzle-push quirk
description: Environment facts for the ads-insights build — orphaned leftover DB schema and why drizzle-kit push cannot run here.
---

## drizzle-kit push needs a TTY it cannot get here

`pnpm --filter @workspace/db run push` AND `push-force` both fail with
"Interactive prompts require a TTY terminal" as soon as drizzle detects ANY
column-conflict ambiguity while diffing the live DB against the schema.

**How to apply:** For fresh/new tables, don't fight it — apply the DDL directly
via `executeSql` (matching the Drizzle table definitions exactly, snake_case
columns) so future introspection sees no diff. Push only works cleanly when the
live DB already matches the schema with zero rename ambiguity.

## The dev database is a large orphaned leftover, not this app's data

The dev Postgres contains a full "himewo" social-media app schema (~60 tables:
profiles, posts, reels, messages, groups, events, etc.) PLUS a Facebook-style
ads system (ad_account_members, ad_coupons, ad_creatives, ad_saved_audiences,
ad_wallet_transactions, ...). This is all leftover state from prior work whose
CODE was lost (only `.agents/memory/himewo-*.md` docs survive). Nothing in the
current codebase references any of it.

**Why it matters:** A `drizzle push` from this repo will offer to DROP all those
unrelated tables (the current schema only defines 7 ad tables). That's expected,
not a bug. When building the ads insights foundation "from scratch", the 15
`ad_*` tables had an incompatible schema (e.g. event tables had only `ad_id`, no
denormalized campaign/adset columns; `ads` had no `campaign_id`; `ad_accounts`
required a NOT NULL `owner_id` uuid), so they were dropped + recreated clean.
Leave the non-ad social tables alone — out of scope.

**Note (may vary per isolated task env):** that clean recreation does NOT
always carry over. In at least one task environment the `ad_*` tables are still
the incompatible orphaned himewo ones (e.g. `ad_impressions`/`ad_clicks` have no
`campaign_id`, `ads` has no `campaign_id`) with zero rows, so `GET
/api/ads/insights` 500s with `column "campaign_id" does not exist` and
`/api/ads/accounts` returns `[]`. If you need working insights data, expect to
re-align + seed the tables to `lib/db/src/schema/ads.ts` again.
