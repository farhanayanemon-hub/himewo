---
name: Shop system (stalls/orders/wallet)
description: Money and authz invariants of the Shop e-commerce system that replaced Marketplace.
---

# Shop system invariants

- One stall per user AND per page (DB unique); stall has no own name — always displays its Hub's name/avatar; creation requires canManagePage.
- Money is integer paisa everywhere ("cents" fields); UI converts taka↔paisa (`formatTaka`/`takaToCents`).
- Commission accrues ONLY at buyer completion, in one transaction, idempotent via partial unique index shop_ledger(order_id, kind): direct → credit seller (total − commission); COD → DEBIT commission (seller balance may go negative — deliberate).
- **Why:** double-confirm must never double-credit; COD money never touches the platform so commission is recovered as a debit.
- Withdrawals debit the ledger at request time under pg_advisory_xact_lock; rejection refunds via a positive ledger row; approval adds no ledger move.
- Stock decrements at order placement in-txn; every cancel path restores it — but ONLY when the status UPDATE actually matched a row (concurrent admins otherwise over-restore inventory).
- Admin shop routes use shop.view/shop.manage perms (incl. /admin/shop/settings — do NOT gate those with settings.* perms).
- Shop settings live in site_settings keys shop_commission_percent / shop_payment_instructions; public GET /shop/settings exposes them to clients.
- Old marketplace tables/generated hooks remain (saved-items still references listings); marketplace UI/routes deleted.
- ghpush2.mjs now expands untracked DIRECTORIES from porcelain and pushes deletions (sha:null tree entries) — previously EISDIR-crashed on new dirs and silently kept deleted files on remote.

## Categories + stall profile (added later)
- `shop_categories` (emoji icon, sortOrder, active, unique name) is ADMIN-managed; buyer landing shows a category grid; product create REQUIRES an active categoryId (server-validated on create AND patch).
- Stalls carry address / productType(physical|digital) / contactPhone / contactEmail; **digital stalls must reject COD server-side** (order create 400) — clients only hide the option.
- Admin category PATCH body is fully optional (partial) so the active-toggle can send `{active}` alone; POST body requires name. Trim-then-check required fields server-side (whitespace bypass guard).
- Smoke tests create their own throwaway category in beforeAll (product create needs one) and pass full stall bodies.
