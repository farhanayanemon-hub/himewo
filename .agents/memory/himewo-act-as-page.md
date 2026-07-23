---
name: Act as a Page (identity switching)
description: How posting/reacting/commenting AS a managed Page works — identity is display-only, actor stays the user.
---

# Act as a Page

A user who owns/edits a Page can switch identity and post/react/comment AS that page.

## Core rule: pageId is DISPLAY-ONLY; the actor stays the user
- `userId`/`authorId` on reactions/comments/posts ALWAYS remains the real user — never the page.
  **Why:** moderation attribution + the one-reaction-per-user unique constraints must keep working. Upsert targets are unchanged; only the stored `pageId` (display identity) changes.
- Notifications keep `actorId = userId` (no notif schema change). The page identity is purely presentational.

## Cross-tenant guard (mandatory)
- ANY client-supplied `pageId` on a write MUST be verified with `canManagePage` (owner/editor membership) BEFORE the insert/upsert. Applies to: `PUT /posts/:id/reaction`, `POST /posts/:id/comments`, `PUT /comments/:id/reaction`, and post create. Page IDs are serial ints → without the check, any user could post as any page.

## Client "acting page" selection
- Web `acting-page.tsx` (localStorage `himewo-acting-page`) + mobile `acting-page.tsx` (AsyncStorage same key) hold the currently-acting page; switcher is hidden when the user manages 0 pages (`useListPages({mine:true})`).
- Compose resolution: `composePageId = pageId ?? (groupId == null ? actingPage?.id : undefined)` — an explicit page/group timeline wins over the global acting page; never act-as-page inside a group.

## Rendering
- When a post/comment/reaction carries `authorPage`/`page`, render the PAGE name+avatar and HIDE the verified badge; tapping routes to `/pages/:id` (both web and mobile). Otherwise render the user and route to profile.
- Reactions-list emits `page: null` when the reactor acted as self (populated PageRef only when page-acting).

## Page avatar NEVER falls back to the owner's personal photo
- A Page is a separate identity with its OWN `avatarUrl`. When `actingPage` is set, ALL identity UI (composer, home compose box, story bar, top-bar/nav, posts) must use `actingPage ? actingPage.avatarUrl : user?.avatarUrl` — page's own avatar, `avatarSrc(null)` → gray default when unset. NEVER `actingPage?.avatarUrl ?? user?.avatarUrl` (that leaks the owner's face into the page identity).
  **Why:** user explicitly chose FB-model (Option A); post-card (what everyone sees) already uses page avatar w/ default and no personal fallback, so composer/story must match or the preview shows your face while real posts show gray — confusing + identity leak.
  **How to apply:** any new spot that shows the acting-page avatar uses the ternary, not `??`. Was previously inconsistent in post-composer/home/story-bar (web) + (tabs)/index, create-post, create-story, StoryBar (mobile).

## Full page-style switch (Facebook-style)
- When `actingPage` is set, ALL "your profile" entry points route to `/pages/:id` and show the page avatar/name instead of the user — this is UI-only, no route hijack of `/me` or `/profile/:id`.
- Scope is deliberately LIMITED to profile entry points + top-bar identity. Feed and notifications STAY personal (user explicitly chose this; do not "helpfully" switch them).
  **Why:** matches the user's chosen scope; feed/notifications as-page would need backend context switching we didn't build.
- Web spots: `main-layout.tsx` top-bar avatar + left sidebar card; `mobile-nav.tsx` slide-out row + bottom tab (compute `profileHref/profileAvatar/profileName` from `useActingPage()`). Mobile: `(tabs)/menu.tsx` profile card + `(tabs)/profile.tsx` `<Redirect href="/pages/:id">` when acting.
