---
name: HiMewo Page about/CTA/reviews
description: Design of Page contact info, call-to-action button, and reviews — plus the URL-safety rule for user-supplied links.
---

# HiMewo Pages: about, CTA, reviews

## Shape
- `pages` table carries optional about/contact fields (phone/email/website/address/hours)
  plus a configurable CTA: `cta_type` (`none|message|call|shop|signup`, NOT NULL default
  `none`) and `cta_url`. `page_reviews` is one-review-per-user (unique `(page_id,user_id)`);
  POST upserts via `onConflictDoUpdate` on that pair.
- Page response exposes `ownerId` (= `createdBy`), `reviewCount`, `averageRating`
  (null when 0 reviews), and `viewerReview` (the caller's own review or null).
- CTA behaviour: `message` → create a **direct** conversation with `ownerId` and navigate
  to it (conversation body field is `memberIds: string[]`, it dedupes direct convos);
  `call` → `tel:` from `contactPhone`; `shop`/`signup` → external link from `ctaUrl`.
- `viewerReview` is built by reusing `buildPageReviews([row])[0]` inside `buildPage`, so
  the review-with-profile shape stays defined in one place.

## URL-safety rule (security — do NOT drop)
Any user-supplied field that ends up in an `<a href>` (here `website`, `ctaUrl`) MUST be
scheme-checked, or a page owner can store a `javascript:`/`data:` link that runs when
another user clicks it (stored XSS).
- **Why:** zod/OpenAPI `string` does not restrict the URL scheme; the value is persisted
  verbatim and rendered to other users.
- **How to apply:** allowlist `http:`/`https:` on **both** sides — server rejects bad
  schemes with 400 on create/update, client only renders a clickable anchor when the URL
  parses as http(s) (else render plain text / hide the CTA). `tel:`/`mailto:` we build
  ourselves from phone/email fields and are inert schemes, so they don't need this.
