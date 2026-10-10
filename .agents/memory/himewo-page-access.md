---
name: HiMewo page access / members
description: Page access model (page_members), boost gating to page posts, ad-account owner transfer, and the web→ads SSO handoff.
---

# Page access & related

## Page members model
- `page_members` (page_id, user_id, role default 'editor', unique idx). Owner stays `pages.created_by` — owner is NOT a member row.
- Only the OWNER manages members (`requirePageOwner` on GET/POST/DELETE member routes). Editors can post as the page and PATCH the page, nothing else.
- `buildPage.viewerCanPost` = owner OR member. `listPages?mine=true` = pages the viewer owns or has access to (used by ads-dashboard "Pages" view).
- Pages have NO visibility/privacy options by design (all public) — user confirmed; don't "add" them.
- LIVE DB: `page_members` was created via Supabase Mgmt API DDL (never drizzle-push live).

## Boost gating
- Boost is allowed ONLY on page posts: web `post-card.tsx` + mobile `PostCard.tsx` `canBoost` requires `post.pageId != null`. Page-top Boost button was intentionally removed.

## "Act as a Page" scope (Facebook-style)
- Acting-as-page is a CLIENT context (`lib/acting-page` on web+mobile). When set, composer avatar/name AND create flows send `pageId`; clients render `authorPage ?? author` everywhere.
- Stories mirror posts for page authorship: bare `stories.page_id` (int, NO drizzle FK, additive DDL on dev+live). POST /stories authz = owner OR page_members (same as POST /posts). serialize groups page stories under key `page:<id>` (vs `user:<uuid>`) and attaches `authorPage` to group + each story.
- **Any new "as a page" surface (posts/stories/uploads):** the server MUST re-verify owner-or-member on the supplied pageId — never trust client actingPage. Display sites must all fall back `authorPage ?? author` or the user avatar leaks through (architect caught the web Home create-story tile).

## Ad account owner transfer
- `POST /ad-accounts/{id}/transfer` — owner-only, self-transfer blocked; old owner becomes admin member, new owner's member row deleted. UI: ads-dashboard Settings "Transfer ownership" card (shown only to owner).

## Web → Ads SSO handoff
- "Ads Manager" link on web passes the Supabase session in the URL hash (`#sso=1&at=...&rt=...`); ads-dashboard auth bootstrap does `setSession` then cleans the hash via `replaceState`.
- **Known accepted risk (architect):** raw tokens in hash are link-injectable/exposed pre-cleanup; hardening path = short-lived one-time exchange token. Deferred deliberately — don't flag as new.
