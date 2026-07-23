---
name: Shop reviews
description: Buyer product reviews on completed shop orders — invariants and wiring.
---

# Shop reviews

- `shop_reviews`: one review per ORDER (unique order_id index is the backstop; route also 409s). Rating 1–5 CHECK at DB + zod. product_id/stall_id denormalized for aggregate queries.
- Only the order's buyer may review, and only when `status === "completed"` (400 otherwise, 403 for non-buyer — including seller).
- Aggregates (`ratingAvg` rounded 2dp, `ratingCount`) are computed live in serializers: products (get/browse/stall list) via one grouped query, stall via `ratingForStall`. No counter columns — no drift risk.
- `ShopOrder.myReviewRating` is buyer-viewer-only (null for sellers) so clients know to show/hide the "Rate product" button.
- `GET /shop/products/:id/reviews` is path-only (no query params) deliberately — avoids the api-zod barrel `*Params` re-export gotcha.
- Review submit UIs: web ReviewDialog in shop.tsx OrderRow; mobile Modal in app/shop/orders.tsx. Both invalidate orders + product + product-reviews + stall queries.

**Why:** trust signal post-Shop launch; once-per-order (not once-per-product) keeps repeat buyers able to review each purchase.
