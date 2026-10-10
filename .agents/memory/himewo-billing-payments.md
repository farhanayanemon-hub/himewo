---
name: Billing & Payments (Stripe)
description: HiMewo ads billing/payments — money-integrity invariants, Stripe graceful degradation, webhook idempotency, where Stripe keys must live.
---

# Billing & Payments

Ads billing = internal wallet (cash `credit_balance_cents`? no — cash is `balance` via transactions; `credit_balance_cents` = promo credit) + per-event charging. Two money buckets on `ad_accounts`: cash balance and promotional credit (`credit_balance_cents`). `spent_cents` = lifetime spend; `spend_limit_cents` = optional cap.

## Money-integrity invariants (do NOT break)
- **Never negative**: DB CHECK constraints on all *_cents money columns; charging must clamp/guard.
- **Credit-first**: per-impression/click charge draws from promotional credit BEFORE cash.
- **Atomic + idempotent charging**: the authoritative dupe guard is a recent-tracking-row check INSIDE `chargeAdEvent`'s transaction, AFTER the account row is locked `FOR UPDATE` — concurrent duplicate impression/click requests serialize on that lock so only the first charges. A route-level pre-check is just a cheap fast-path, not the guarantee. Charge ledger rows also carry `reference_id = charge:<event>:<trackingId>` (partial-unique where not null) for audit + replay backstop. NOTE: without a client-supplied event id, replays OUTSIDE the dedup window are treated as new events (inherent limit).
- **Spend limit + threshold auto-pause**: when spend hits the limit, ads auto-pause. Ad serving REQUIRES spendable funds (cash+credit > 0) — intentional Task #4 contract change; a fully-broke account serves no ads.

## Stripe (money-IN only: top-up + saved cards + auto-recharge)
- Internal charging/coupons work WITHOUT Stripe. Only wallet top-up, saved cards, and off-session auto-recharge need Stripe.
- **Graceful degradation**: `stripeConfigured()` gates Stripe features. `BillingSettings.paymentsEnabled` drives the UI — when false the wallet page shows "Payments not configured yet" instead of erroring. App is fully functional without keys.
- **Webhook idempotency**: crediting the wallet on `checkout.session.completed` / `payment_intent.succeeded` is keyed on the PaymentIntent id (reference_id) so webhook retries don't double-credit. Webhook route needs `express.raw` body (mounted before json parser in app.ts).
- **Auto-recharge single-flight**: `maybeAutoRecharge` passes a Stripe `idempotencyKey` (per account + minute bucket) so a burst of threshold-crossing charges can't create duplicate off-session top-ups before the webhook credit lands. `removeCard` MUST verify the payment method belongs to the account's Stripe customer before detach (cross-tenant guard), same as `setDefaultCard`.
- **Keys live on RAILWAY, not Replit.** Prod API runs on Railway (see [Deploy pipeline](himewo-deploy.md) for the service id). `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` must be set as Railway env vars (via GraphQL API with RAILWAY_TOKEN) for live payments — setting them as Replit secrets does nothing for prod.

## Coupons / ad-credit
- `ad_coupons.status` + `redeemed_at`; redemption is atomic and single-use/expiry/assignment aware; credits `credit_balance_cents`.

## Deploy gotcha
- `npx wrangler pages deploy` can fail with `ECOMPROMISED / Lock compromised` (npm cache). Fix: `rm -rf ~/.npm/_locks ~/.npm/_cacache/tmp && npm cache verify`, then retry with a pinned version (`npx wrangler@4.107.0 ...`).
