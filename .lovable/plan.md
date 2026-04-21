

# Secure Order Chat & Evidence Vault

A complete overhaul of the chat system to tie conversations to orders, add server-side retention, soft-delete, audit logs, attachments, disputes, and an admin evidence dashboard.

This is large — I'll deliver it in **3 phases** so you can review and test each before moving on. Below is the full design + Phase 1 scope.

## Current state (relevant)
- `chat_messages` exists with conversation_id like `userId_vendorId[_productId]`. Hard-deletable from DB only by no one (no DELETE policy). No order link, no attachments, no edit history, no audit log.
- `orders` and `order_items` exist; orders link buyer ↔ vendor through items.
- Admin already has `/admin/messages` (read-only viewer).
- No riders/delivery agent role yet.

## Target architecture

### New / modified DB schema

**Modify `chat_messages`** (additive — preserves existing data):
- `order_id uuid null` — link a chat to an order (nullable for pre-order inquiries).
- `message_type text default 'text'` — `text | image | file | voice | location | system`.
- `attachment_url text null`, `attachment_type text null`, `attachment_size int null`.
- `deleted_by_sender boolean default false`, `deleted_by_receiver boolean default false`, `deleted_at timestamptz null`.
- `edited_at timestamptz null`, `is_system_message boolean default false`.
- `seen_at timestamptz null` (replaces lossy `is_read`; keep `is_read` for back-compat, derive from `seen_at`).
- Index on `(order_id, created_at)` and `(conversation_id, created_at)`.

**New tables**
- `message_edit_history` — `id, message_id, old_text, new_text, edited_by, edited_at`.
- `audit_logs` — `id, user_id, order_id, action_type, action_details jsonb, ip_address, user_agent, created_at`. Append-only.
- `disputes` — `id, order_id, opened_by, reason, status (open|investigating|resolved|closed), admin_notes, opened_at, closed_at`.
- `chat_attachments` — `id, message_id, order_id, file_name, file_url, file_type, file_size, uploaded_by, created_at` (mirrors message attachment for evidence indexing + dispute lock).
- `user_risk_flags` — `id, user_id, flag_type (cod_risk|vendor_risk|delete_abuse|unreachable), reason, score, created_at, expires_at`.

**Storage bucket**: `chat-attachments` (private). Path `orders/{order_id}/{message_id}/{filename}`. RLS allows upload by chat participants and read by participants + admins.

### Soft-delete & retention rules
- DELETE on `chat_messages` is forbidden (no policy).
- "Delete for me" flips `deleted_by_sender` or `deleted_by_receiver` based on `auth.uid()`.
- "Delete for everyone" allowed within 5 min of `created_at`, sets `deleted_at` and clears `message_body` to `[message removed]` while keeping a copy in `message_edit_history` so admins still see original.
- Dispute lock: when an open dispute exists for the order, all delete/edit RPCs return error.
- Admins see everything regardless of flags.

### RLS policies
- Participants (buyer, vendor.user_id, future rider) can SELECT messages where they belong to the conversation OR are linked to the order.
- INSERT requires `sender_id = auth.uid()` AND sender is a participant of that order/conversation.
- UPDATE limited to `seen_at`, `deleted_by_*` flags, and edits within 5 min via SECURITY DEFINER RPCs.
- `audit_logs`: INSERT by service role / SECURITY DEFINER triggers only; SELECT by admins only.
- `disputes`: opened_by buyer or vendor of the order; viewed by participants + admins.

### RPCs (SECURITY DEFINER)
- `send_chat_message(order_id, conversation_id, vendor_id, message_type, body, attachment...)` → inserts message + audit log + system events.
- `mark_messages_seen(message_ids[])` → bulk update `seen_at`.
- `delete_message_for_me(message_id)` → flip the right `deleted_by_*` flag.
- `delete_message_for_everyone(message_id)` → enforces 5-min window + dispute check; archives original to edit history.
- `edit_message(message_id, new_text)` → 5-min window + edit history + audit log.
- `open_dispute(order_id, reason)` → creates dispute, locks chat, writes audit log, notifies admins, posts system message "Evidence locked for review".
- `log_system_event(order_id, event_type, details)` → trigger-driven for order created, status changes, payment events.

### System messages (auto)
Triggers on `orders` and `order_items` status changes insert a `chat_messages` row with `is_system_message=true` for: order created, vendor confirmed, shipped, delivered, cancelled, dispute opened, dispute resolved.

### Frontend changes

**Buyer/seller chat (`ChatDialog.tsx` + new `OrderChatPage.tsx`)**
- Show order context header when `order_id` present (order #, status, total).
- Attachment button (image/file/voice).
- Long-press / context menu: "Delete for me" always, "Delete for everyone" within 5 min, "Edit" within 5 min.
- Render system messages as centered grey bubbles.
- Render deleted-for-me as hidden from that user's view; deleted-for-everyone as italic placeholder.
- Banner when dispute open: "Chat locked — evidence preserved for review."
- Transparency footer on first open: "Chats related to orders may be securely retained…".

**Account → Orders**: each order row gets a "Chat" button → `/account/orders/:id/chat`.

**Admin Evidence Dashboard (`/admin/evidence`)**
- List view: search by order #, phone, product, date range.
- Detail view per order: buyer & vendor profiles, full chat (incl. all soft-deleted messages with strike-through and "deleted by buyer/seller @ time" labels), attachments grid, audit log timeline, dispute history, payment & delivery status, risk flags, "open dispute / resolve" controls.
- Replace existing `/admin/messages` with the richer view (or keep it as quick view and add a "View evidence" link).

**Risk flags UI**
- Admin user detail shows current risk flags with reasons; nightly cron-style RPC populates flags from heuristics (delete abuse = >X deletes within 24h; COD risk requires future rider feedback — stub for now).

## Phased delivery

### Phase 1 — Schema + Server-side retention + Soft-delete (this round)
- Migration for `chat_messages` columns, `message_edit_history`, `audit_logs`, `chat_attachments`, `disputes`, `user_risk_flags`, `chat-attachments` bucket + RLS.
- RPCs: `delete_message_for_me`, `delete_message_for_everyone`, `edit_message`, `mark_messages_seen`, `log_system_event`.
- Triggers: order status → system message + audit log; message INSERT → audit log; risk-flag heuristic for delete abuse.
- Update `ChatDialog.tsx`: hide messages where the current viewer's `deleted_by_*` flag is true, render deleted-for-everyone placeholder, render system messages, message context menu (delete-for-me / delete-for-everyone / edit with timer), seen receipts.
- Transparency banner.

### Phase 2 — Order linking + Attachments + Dispute lock
- Migrate existing pre-order conversations as-is; new chats opened from an order page set `order_id`.
- New `OrderChatPage.tsx` with order header, accessible from `/account/orders/:id/chat` and `/vendor/orders/:id/chat`.
- Attachment upload (image/file/voice via MediaRecorder), storage policies, `chat_attachments` mirror.
- "Open dispute" button on order → calls `open_dispute` RPC, posts system message, locks chat UI.

### Phase 3 — Admin Evidence Dashboard + Risk flags
- New `/admin/evidence` route with search/filter and order-detail view (chat with deleted messages visible, audit timeline, attachments grid, dispute controls).
- Risk-flag display on `/admin/users/:id`, `/admin/vendors/:id`.
- Replace `AdminMessages.tsx` with link into evidence view (or keep as fast preview).
- Data retention notes documented in admin settings; actual purging out of scope for now (keeps everything).

## Out of scope (call out for later)
- Rider role + rider chat (no rider entity yet — would need a `riders` table and order assignment).
- End-to-end encryption (incompatible with admin evidence requirement; we use TLS + at-rest encryption from the platform).
- Tamper-resistant cryptographic signing of audit logs (postponed; append-only RLS + service-role-only INSERT is the v1 protection).
- Automated retention purge job (kept indefinitely for now; manual admin tooling later).
- Voice transcription.

## Files (Phase 1)

**Migrations**
- new migration: schema changes above + RPCs + triggers + bucket + policies.

**Edits**
- `src/components/shared/ChatDialog.tsx` — soft-delete UI, system messages, edit/delete menu, transparency banner, seen receipts via `seen_at`.
- `src/pages/admin/AdminMessages.tsx` — render deleted/edited markers and system messages so admins see retention working.

**No new pages in Phase 1** — Phase 2 adds `OrderChatPage.tsx` and Phase 3 adds `/admin/evidence`.

## Confirmation needed before I start
Reply **"Approved"** and I'll execute Phase 1. After Phase 1 is tested I'll move to Phase 2, then Phase 3.

