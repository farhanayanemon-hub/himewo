---
name: RN Soft-3D shadow system gotchas
description: Cross-platform shadow/glow helper and the overflow-clipping pitfall in artifacts/mobile
---

The mobile app's depth comes from `artifacts/mobile/constants/shadows.ts`
(`shadow(level)` / `glow(color)`), which branches by platform.

- **Why the branch exists:** RN-web maps `shadow*` style props to `boxShadow`
  and logs a deprecation warning; native needs `shadow*` + `elevation`. The
  helper returns a `boxShadow` string on web and the native props on native, so
  the warning is benign and depth looks right on both.

- **overflow:"hidden" clips native shadows.** Any view that carries `shadow()`
  must NOT also set `overflow:"hidden"` on the same node, or iOS/Android clip the
  elevation. Fix by dropping overflow when children have no own background (a
  view's `backgroundColor` still rounds via `borderRadius` without overflow), or
  split into an outer shadow wrapper + inner overflow-hidden content when child
  media (e.g. an image) must be clipped to the corners.
  **How to apply:** when adding `shadow()` to a rounded "card", check for
  `overflow:"hidden"` on the same style and remove/restructure it.
