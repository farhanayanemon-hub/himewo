---
name: HiMewo Supabase JWT verify (jose bundling trap)
description: Why deployed Express auth rejected valid Supabase ES256 tokens, and the node:crypto fix
---

# Symptom
Live HiMewo api-server (Express, Railway, esbuild ESM bundle, Node 18) returned `401 {"error":"Unauthorized"}` for EVERY request needing auth, even with a freshly minted, valid Supabase ES256 access token. Same token hitting the app directly on `localhost:8080` (bypassing Cloudflare) also 401'd, so it was server-side, not the CDN/proxy.

# What was NOT the cause (all verified)
- Env was correct in the running process (`/proc/1/environ`): `SUPABASE_URL` set, `SUPABASE_JWT_SECRET` absent (so HS256 branch skipped, JWKS branch taken).
- JWKS endpoint reachable (HTTP 200) from the container.
- node:crypto verified the ES256 token fine in-container.
- jose imported from `node_modules` verified the SAME token fine in-container (`jwtVerify` → OK).
- Deployed bundle DID contain the JWKS code (grep the real `dist/index.mjs`, NOT `.js`).

# Root cause
jose v6, once **bundled by esbuild** into the server's ESM output, failed at runtime on Node 18 even though the unbundled `node_modules` jose worked. Identical env/token/Node/machine — the only difference was the bundling. So `jwtVerify` threw, the `catch { return null }` swallowed it, `req.userId` stayed unset, `requireAuth` → 401.

# Fix
Removed the `jose` dependency from the auth path. Verify Supabase JWTs with **node:crypto** directly:
- Split JWT; base64url-decode header/payload/sig.
- HS256: `crypto.createHmac` + `timingSafeEqual` (only if a shared secret exists).
- ES256/RS256: fetch JWKS, match `kid`, `crypto.createPublicKey({format:"jwk", key:jwk})`, then `crypto.verify`. **ES256 requires `dsaEncoding:"ieee-p1363"`** and digest `"sha256"`; RS256 uses `"RSA-SHA256"`.
- Check `exp`/`nbf` with ~60s skew; return `payload.sub`.
Validated against live Supabase before deploy (RESOLVED_UID matched the user's sub).

**Why:** bundled third-party crypto libs can silently break under esbuild; node:crypto is built-in and bundling-proof.
**How to apply:** if a deployed (bundled) server rejects tokens that verify fine when the same lib is run unbundled, suspect the bundle, not the lib/env — prefer node:crypto for JWT verification in esbuild'd servers.

# Deploy path (no push creds)
Railway auto-deploys on push to GitHub `main`. With no push credentials, the reliable route for a non-technical owner is editing the file via the GitHub web UI (`github.com/<owner>/<repo>/edit/main/<path>`) and committing to main — that triggers the Railway build. Re-adding `SUPABASE_JWT_SECRET` does NOT help: tokens are ES256, an HS256 secret can't verify them.

# Diagnostic gotcha
esbuild output here is `.mjs` (outExtension `.js`→`.mjs`). A grep filtered to `*.js` gives a FALSE "code missing" negative. Always grep the actual `dist/index.mjs`.
