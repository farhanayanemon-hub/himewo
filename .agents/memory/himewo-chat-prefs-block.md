---
name: Chat prefs + block/restrict
description: Per-member conversation prefs (pin/mute/archive/markedUnread/clear) and user_blocks block|restrict semantics in the chat system.
---

# Conversation prefs (per member)
- `conversation_members` carries per-user prefs: `is_pinned`, `is_muted`, `is_archived`, `marked_unread`, `cleared_before_id`. PATCH `/conversations/:id/prefs`, POST `/conversations/:id/clear`.
- **"Delete chat" = clear, not delete.** Clear sets `cleared_before_id` to the latest message id, unpins, resets markedUnread. `listMessages` and unread counts filter by the cutoff. The other member keeps everything.
- Chat list deliberately hides conversations with `lastMessage === null` (cleared or brand-new empty) and archived ones; they reappear on the next message. Messenger-like, intentional.
- `markRead` (POST `/conversations/:id/read`) also clears `marked_unread` server-side.
- Long-press "Mark as read/unread" must use EFFECTIVE unread (`unreadCount > 0 || markedUnread`): real unread → call markRead with lastMessage.id; manual flag → toggle pref. Label from markedUnread alone is wrong (architect-caught bug).

# user_blocks (block | restrict)
- Table `user_blocks(user_id, target_id, kind)`, kind `block|restrict`. Routes: POST/DELETE `/users/:id/block` and `/restrict`, GET `/me/blocked` + `/me/restricted` (scoped to requester).
- **Block** = no direct-conversation create AND no direct-message send, enforced BOTH directions (`isBlockedBetween`). 403 "You can't message this person". Self-block → 400.
- **Restrict** = messages still delivered; only notifications suppressed (skip in `createNotification` when recipient restricts sender). Muted conversations also skip notifications.
- **Why:** block is a hard wall; restrict is Messenger-style quiet delivery. Keep enforcement in create+send (not just UI) so all clients inherit it.
- If deploying: live DB needs DDL for `user_blocks` + new `conversation_members` cols (Supabase Mgmt API; never blind drizzle-push to live).

# Chat app settings boundary
- HiMewo Chat app has NO password change / Accounts Center of its own — those screens deep-link to the main HiMewo app. Chat privacy settings own only blocked/restricted lists. Keep account management single-homed in the main app.
