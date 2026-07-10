---
name: Chat message actions (edit/unsend/hide/reply)
description: Messenger-style message actions contract — edit window, delete-for-me table, realtime events
---

# Chat message actions

- **Edit window**: messages AND comments editable only within 15 min of creation; enforced SERVER-side (403 "Edit window expired") plus UI gating on all clients. Window constant duplicated client-side (15*60*1000) — change both if product changes it.
- **Delete-for-me**: `message_hides` table (unique message_id+user_id); list-messages excludes viewer-hidden ids. Hide is idempotent (onConflictDoNothing → 204).
- **Unsend** = DELETE /messages/:id → sets deletedAt, serialize empties content/attachments; clients render italic tombstone. Edit is blocked on deleted messages.
- **Realtime**: `message_updated` broadcast on edit; clients treat message/message_updated/message_deleted identically (invalidate queries). RealtimeEvent union has a catch-all so new event types flow through without type changes.
- **Reply**: replyToId already existed in contract; chat app renders quote via in-memory map lookup of the loaded page (older-page originals show "Unavailable" — accepted).
- **Why**: user wanted exact Messenger parity (Reply first in long-press menu).

## Dev-DB testing gotchas
- Dev `Bearer dev:<uuid>` tokens do NOT auto-create profiles — insert a profile row first or use seed users `00000000-0000-4000-8000-0000000000NN` (but seed may not be loaded; check `select * from profiles`).
- Orphaned legacy rows in dev DB leave serial sequences behind max(id) → inserts 500 with FK/PK errors; fix with `setval(pg_get_serial_sequence(...), max(id)+1, false)`.
