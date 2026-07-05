---
name: ads.himewo.com "blank" was a screenshot-tool false negative
description: When a live SPA looks blank ONLY in the automated screenshot tool, cross-check before "fixing" — it may render fine for real users.
---

# ads.himewo.com blank-screen scare (resolved: NOT a bug)

The automated screenshot/firecrawl tool reported ads.himewo.com as a pure-white
blank on all routes, while the other 4 live apps rendered. Deep investigation
proved the site was actually fine and the tool gave a **false blank**.

**How it was disproven (order of cheap→decisive):**
- Assets served 200 with correct `content-type: application/javascript` (== working web app); MIME hypothesis dead.
- Deployed bundle hash was byte-identical to a fresh local prod build → not stale.
- Loaded the real prod bundle in **jsdom** (Node, no browser system libs needed): full login page rendered ("HiMewo Ads Manager / Email / Password / Login / Continue with Google"), **zero** pageerrors/unhandled rejections.
- `web` (himewo.com, renders in firecrawl) and `ads` share an **identical** `main.tsx` (same top-level `localStorage`/`matchMedia` theme init) → the localStorage-throw theory was wrong.
- The only dynamic import in the bundle is `import("@opentelemetry/api").catch(()=>null)` (Supabase optional dep) — harmless.
- **Ground truth:** asked the (non-technical) user to open the URL in their own browser → they saw the login page fine.

**Why:** the screenshot tool can render a working React+Vite SPA as blank
(timing/sandbox quirk) even when assets, MIME, code, and real browsers are fine.

**How to apply:** treat a screenshot-tool "blank" as a *lead*, not a verdict.
Before spending effort "fixing," cross-check with: asset headers, a jsdom load of
the real bundle (catches genuine crashes without needing chromium system libs,
which are missing in this env — `libglib-2.0.so.0` → playwright chromium won't
launch here), and/or a quick user confirmation in their own browser. Do NOT
redeploy/change code when nothing is broken.
