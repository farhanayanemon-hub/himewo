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

## Reviews on/off + self-review block (product rules — keep consistent)
- A page owner/manager must **NOT** be able to review their OWN page — only outsiders can.
  Enforced server-side (POST reviews 403 when `canManagePage`) and surfaced as
  `viewerCanReview = viewerId && !viewerCanPost && reviewsEnabled`; the client gates the
  composer on this flag.
- `pages.reviews_enabled` (bool default true) is a per-page toggle in the edit dialog. When
  off, the whole Reviews block is hidden and POST reviews 403s. **Why:** owners asked to be
  able to turn reviews off entirely; don't silently keep accepting reviews when disabled.

## Following + media (page profile parity)
- Pages follow other pages via a separate `page_following` table (page→page, self-follow
  blocked); `followingCount` sits alongside `followerCount`. Page follow/unfollow accept
  `asPageId` so the acting page (not the user) follows.
- Page profile has a Photos/Videos tab backed by `GET /pages/:id/media` (`PageMediaItem`:
  postId/url/type/thumbnailUrl). Web and **mobile** page profiles are full parity — mobile
  also has owner edit (incl. reviews toggle), inline avatar/cover edit, owner page-access
  member mgmt, and the message CTA (mobile DOES support conversations via useCreateConversation).

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
