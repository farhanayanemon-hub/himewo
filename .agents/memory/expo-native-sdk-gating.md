---
name: Expo native-only SDK gating
description: How to safely include a native-only SDK (e.g. WebRTC/Stream Video) in an Expo app that also runs in Expo Go and on web.
---

A `Component.native.tsx` / `Component.tsx` split keeps the native SDK out of the **web** bundle (web resolves `.tsx`, tsc also resolves `./Component` to `.tsx`). But it does NOT protect **Expo Go**: Expo Go is native, so Metro resolves `Component.native.tsx`, and any top-level `import` of a custom-native-module SDK there is *evaluated* at startup and crashes (the native module isn't present in Expo Go).

**Rule:** never statically import a custom-native-module SDK from a file that Expo Go will resolve. Put the real implementation in its own module and load it with a runtime-guarded `require`:

```ts
import Constants, { ExecutionEnvironment } from "expo-constants";
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const Engine = isExpoGo ? Fallback : require("./RealEngine").default;
```

**Why:** Metro still *bundles* the required module, but JS only *evaluates* a module when `require` actually runs. The non-selected ternary branch never runs in Expo Go, so the SDK's top-level code (native module access) never executes → no crash. A dev build / standalone app takes the real branch.

**How to apply:** real native calls/camera/WebRTC SDKs in Expo projects that must still open in Expo Go or web. Keep a fallback component with an identical `{children}` prop shape for the gated branch and web.
