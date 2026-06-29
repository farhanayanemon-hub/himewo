---
name: reanimated is not usable in artifacts/mobile
description: react-native-reanimated is in package.json but its babel worklets plugin is NOT configured, so use React Native's built-in Animated instead.
---

# reanimated is NOT usable in artifacts/mobile (use built-in Animated)

`react-native-reanimated` (~4.1.x) + `react-native-worklets` are listed in
`artifacts/mobile/package.json`, but `babel.config.js` only has `babel-preset-expo` with NO
worklets/reanimated plugin, and nothing in the app actually imports reanimated.

**Rule:** for animations in `artifacts/mobile`, use React Native's built-in `Animated` API
(`Animated.Value`, `Animated.timing/loop/sequence`, `interpolate`, `useNativeDriver`). Do NOT
reach for `useAnimatedStyle`/`withTiming`/`FadeIn*` from reanimated.
**Why:** without the babel worklets plugin, every reanimated worklet (shared values, entering
animations) crashes at runtime. Built-in `Animated` needs no plugin and works in the web export.
**How to apply:** when animating, set `useNativeDriver: Platform.OS !== "web"` (web doesn't
support the native driver) and only animate `opacity`/`transform`. Stop `Animated.loop`s in the
effect cleanup.
