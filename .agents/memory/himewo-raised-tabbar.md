---
name: Raised-center custom tab bars (Solid Dock)
description: Gotchas for the custom RN/web bottom nav with a raised middle button, shared across web + both mobile apps.
---

# Raised-center "Solid Dock" bottom nav

All three HiMewo apps share a "Solid Dock" bottom nav: a solid docked bar with a
label under every item and a **raised center button** that lifts above the bar.

- **Web** (`artifacts/web/src/components/layout/mobile-nav.tsx`, `MobileNav`): Reels is the raised squircle. Uses theme tokens (`bg-background`, `text-primary`, `border-border`) so dark mode still works — do NOT hardcode the mockup's `#0055FF`.
- **Mobile** (`artifacts/mobile/components/SolidDockTabBar.tsx`): custom `tabBar` on expo-router `<Tabs>`; Reels raised; `menu` route stays `href:null` and is skipped by the bar's ORDER list.
- **Chat** (`artifacts/mobile-chat/components/SolidDockTabBar.tsx`): 4 real tabs + a raised **compose action** (not a route) that routes to the `people` picker.

## Durable lessons

- **Raised button hit target:** the raised button is absolutely positioned and protrudes ABOVE its parent `Pressable`/bar bounds. In React Native, touches do NOT extend past a parent's bounds, so the protruding top is visible but dead. Fix = `hitSlop={{ top: ~24 }}` on the item Pressable (or give the button its own bounded hitbox). Applies to both mobile tab bars.
  **Why:** flagship affordance silently half-untappable otherwise.

- **`BottomTabBarProps` needs an EXPLICIT dep:** `@react-navigation/bottom-tabs` ships transitively via expo-router, but under pnpm it is NOT resolvable for a `tsc` type-only import (TS2307). Add it explicitly to each mobile app (`pnpm --filter @workspace/<app> add @react-navigation/bottom-tabs@<expo-router's version>`) — pinned to the already-installed version to avoid churn.

- **A non-route action button (chat compose) must still emit `tabPress`** for its target route before `navigation.navigate(...)`, and respect `defaultPrevented`, to match React Navigation tab semantics.
