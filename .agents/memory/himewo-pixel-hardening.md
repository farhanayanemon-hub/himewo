---
name: Conversion pixel hardening
description: The public /ads/pixel + pixel.gif beacon must never 500 and must write clean rows — the invariants to keep.
---

# Conversion pixel hardening

The conversion pixel endpoints (`POST /ads/pixel`, `GET /ads/pixel.gif`) are
PUBLIC and UNAUTHENTICATED (authenticated only by the HMAC pixel token). They
receive junk, replays, and bursts from real browsers. Two invariants must hold
for every field the beacon writes into `ad_conversions`:

1. **The beacon never 500s on bad input.** The `.gif` handler already wraps
   capture in try/catch and always returns the gif. `POST /ads/pixel` is ALSO
   wrapped — on capture error it logs and returns `{attributed:false,adId:null}`
   (200), never a 500. Any NEW public pixel field must not be able to throw the
   request.

2. **Rows stay clean** (all enforced in `capturePixelConversion`):
   - `valueCents` clamped to `[0, MAX_VALUE_CENTS]` (1e9 — well under the int4
     column max 2147483647) and non-finite → 0. An unclamped huge value
     overflows the `integer` column and throws.
   - `viewerId` accepted ONLY if it matches the UUID regex, else null (the
     column is `uuid`, so a malformed value throws on cast). A valid-format but
     UNKNOWN uuid still FK-violates (23503) → the insert is retried once with
     null viewer so the beacon doesn't fail.
   - `metadata` serialized and size-capped (`MAX_METADATA_BYTES` 4096); oversized
     → stored as `{_truncated:true}`; non-object rejected by zod (400);
     circular/non-serializable → null.
   - `eventName`/`currency`/`pixelId` length-capped server-side.

3. **Rapid-duplicate suppression:** an identical conversion (same account +
   viewer + eventName + valueCents) from the same viewer within
   `DEDUP_WINDOW_MS` (10s) returns the existing row instead of inserting a new
   one, so double-fired pixels / retries / prefetch don't inflate reports. Soft
   (no DB unique index), so truly simultaneous fires can still both insert —
   acceptable for the burst case this targets.

**Why:** bad conversion data pollutes advertiser insights (ROAS, cost-per-
conversion) and the pixel can't be trusted to send well-formed input.

**How to apply:** when adding any field or column captured from the pixel,
clamp/cap/validate it in `capturePixelConversion` and make sure a bad value can
only degrade to a clean default — never throw. Tests live in
`ads-analytics.test.ts` under the "conversion pixel hardening" describe block.
