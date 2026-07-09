---
name: Hashtags + auto-albums
description: How clickable hashtags and FB-style auto-albums work across web/mobile, and their invariants.
---

# Hashtags + auto-albums

- Hashtag contract: `#(\w{1,64})` (HASHTAG_RE) shared web (`mention.tsx`) + mobile (`Mention.tsx`); rendered links go to `/hashtag/:tag`. Post BODIES must render via RenderWithMentions (web) / MentionText (mobile) — plain `{post.content}` silently loses both mentions AND hashtags; check any new post-rendering surface.
- Hashtag feed endpoint filters with exact-tag regex + prefilter (public/friend authors) + filterVisiblePosts batch-scan (same privacy pattern as watch feed).
- Auto-albums: `albums.kind` ('custom'|'profile'|'cover'); rows auto-inserted in PATCH /users/me on avatar/cover change; kind!=custom albums are non-deletable (403). Web `/hashtag/:tag` route must stay BEFORE the `/:username` catch-all.
- Mobile: profile tab reuses ProfileBody (extracted from profile/[id].tsx) with hideBackButton; menu tab hidden via `href: null` but still reachable with router.push("/menu") from the home header button.
