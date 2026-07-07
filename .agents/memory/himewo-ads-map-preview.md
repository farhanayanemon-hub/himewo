---
name: Ads map targeting + ad preview
description: Constraints behind the ads-dashboard Leaflet location map and the FB-style ad preview card
---

# Ads map targeting + ad preview

- Location targeting is NAME-based (AdTargetingSpec.locations = string[]), because user locations are free text with no geo data. The Leaflet map is a picker UI only — clicking a dot (or anywhere near a city, nearest-place within ~2.5°) toggles the place NAME. Do NOT add radius/coordinate targeting without a serving-side geo story; encoding "City +25km" strings would silently break location matching.
- **Leaflet gotcha:** CircleMarker clicks bubble to the map click handler by default → double toggle (add then instantly remove). Must set `bubblingMouseEvents: false` in pathOptions when the map also has a `useMapEvents` click handler.
- Ad preview (`ad-preview.tsx`) renders untrusted mediaUrl in img/video src — keep the http(s)-only guard + error fallback; reset the error state when the URL changes.
- react-leaflet v5 requires React 19 (catalog react 19.1.0 — OK).
