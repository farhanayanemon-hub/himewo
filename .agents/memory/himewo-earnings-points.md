---
name: HiMewo Points & Earnings backend
description: Durable invariants/decisions for the marketing points→USD earning system (separate from video monetization)
---

# Points & Earnings (marketing rewards)

The **marketing** earning system (earn points for posts + engaging with OTHERS' posts →
USD balance). SEPARATE from any future video-monetization. Currency is ALWAYS shown in USD;
points are an internal unit. Globally toggleable from admin (OFF = zeros everywhere; non-summary
routes 403).

## Earning scope = posts only
Award ONLY for: creating a post, and liking/commenting/sharing OTHERS' posts. Do NOT award for
liking comments (was briefly wired, removed).
**Why:** every extra earning vector inflates real-money balances beyond the agreed rules.

## Anti-farm invariant (per-action, NOT uniform)
The spec treats the three engagement actions differently — do not collapse them:
- **Likes/reactions**: idempotent, keyed by the POST (`entityType="post"`), so like→unlike→like awards once.
- **Comments**: keyed per COMMENT row (`entityType="comment"`) so distinct comments earn, PLUS a
  duplicate-text guard — award only if the user has no earlier comment with identical `content`
  (so repeating the same text never farms). Bounded by the daily cap.
- **Shares**: keyed per SHARE row (`entityType="share"`), bounded only by the daily cap.
**Why:** the spec explicitly says likes use idempotency-by-entity while comments/shares "rely on the
daily cap plus a duplicate-comment guard." Keying comments/shares by post would wrongly cap them at
one award per post forever.

## Daily cap must clamp, not just stop
When a cap is set, award `min(actionPoints, remaining)` — never let the final action overshoot the
cap (e.g. cap 15, two posts worth 10 → 10 then 5, total 15). The cap read + insert must be atomic
(per-user advisory lock) or concurrent awards both pass the check and exceed the cap.
**Why:** caps are a fraud control; overshoot = paying out more real money than configured.

## Withdrawal state machine
States: `pending → approved → paid`; `rejected` reachable from `pending` OR `approved`; `paid`/`rejected`
are terminal. Admin process accepts target `approved | paid | rejected` with per-target allowed source
states. Reject refunds the spent points; approve/paid never touch the ledger.
**Why:** spec Step 6 requires approve/reject/mark-paid (not just paid/rejected).

## Money-integrity invariants
- Balance is a ledger sum (earns +, withdraw −, refund +).
- Withdrawal create and admin process must be concurrency-safe (per-user advisory lock + in-txn
  balance recheck on create; conditional transition `WHERE status IN (allowed sources)` on process,
  refund only when that transition actually wins — idempotent refund insert guards double-refund).
- Admin "reset" = zero the balance via a single `admin_adjust` ledger entry of `-currentBalance`,
  computed under the SAME advisory lock awardPoints uses (`hashtext(userId)::bigint`) so it serializes
  with concurrent earns. "adjust" is additive; "reset" is absolute-to-zero. Both required by spec.
**Why:** naive pre-checks let concurrent requests overspend or double-refund.

## Admin auth (drift from plan)
No existing admin RBAC backend — admin endpoints use env allowlist `ADMIN_USER_IDS` +
`requireAdmin`. Dev convenience: empty allowlist AND non-production ⇒ any authed user is admin.
Production with empty allowlist denies everyone.
