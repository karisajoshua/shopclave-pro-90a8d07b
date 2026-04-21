

# Preserve original message content for admin evidence review

## Problem
When a user (buyer or vendor) chooses **"Delete for everyone"**, the database function `delete_message_for_everyone` overwrites the message text with `[message removed]` and **NULLs out** the attachment fields. As a result, even though admins are technically allowed to see deleted messages, there's nothing left to see — the original text and any image/voice/file attachment are gone forever for everyone, including the admin. This breaks evidence collection during disputes.

The original text **is** preserved in `message_edit_history.old_text`, but attachments are not, and neither view (Admin Evidence, Admin Messages) actually surfaces the original.

## Fix overview

Stop destroying evidence at the source, and surface the originals in the admin views — while keeping the buyer/vendor experience unchanged (they still see "[message removed]" / nothing).

### 1. Database — preserve original text and attachment metadata

Add three new columns to `chat_messages`:
- `original_message text` — snapshot of the text at the moment of deletion
- `original_attachment_url text`
- `original_attachment_type text`
- `original_attachment_size integer`

Update `delete_message_for_everyone(...)` so that when a message is deleted:
- It **copies** `message`, `attachment_url`, `attachment_type`, `attachment_size` into the new `original_*` columns
- Then sets the public-facing `message = '[message removed]'`, `deleted_at = now()`, and NULLs the public `attachment_*` fields (unchanged behavior for buyer/vendor)

Update `delete_message_for_me(...)` to also snapshot into the `original_*` columns the first time a side hides the message, so admins can always see what was hidden.

Add an RLS policy / column-level note: the `original_*` columns are only readable by admins. The existing "Admins can view all messages" SELECT policy already grants admins full row access, but buyer/vendor RLS policies will be tightened in code (frontend never selects `original_*`) and we'll add a SECURITY DEFINER function `admin_get_message_originals(_message_ids uuid[])` that returns the originals only when `has_role(auth.uid(), 'admin')`. This keeps originals invisible to non-admins even if they craft their own query.

### 2. Admin Evidence Vault (`AdminEvidence.tsx`)

In the chat history panel, for any message where `deleted_at` is set OR `deleted_by_sender`/`deleted_by_receiver` is true:
- Render a clearly-marked red-bordered evidence block:
  - Top line: red **"DELETED — admin view"** badge with the deletion timestamp and who deleted it (sender vs receiver)
  - Below that, the **original message text** (from `original_message`) shown in normal type, prefixed with a small italic label *"Original content preserved for review:"*
  - If there was an attachment, render the **original attachment** using the existing `AttachmentPreview` component, with a small "Original attachment" caption
- Pull the originals via the new `admin_get_message_originals` RPC after loading messages.

### 3. Admin Messages page (`AdminMessages.tsx`)

Same treatment, smaller surface:
- Deleted messages keep the existing red border but now show the **original text** struck-through-but-readable, plus the attachment thumbnail if any
- Footer keeps the existing `· DELETED FOR EVERYONE` / `· hidden by sender` flags

### 4. Backfill historical data

For any existing rows where `deleted_at IS NOT NULL` and `original_message IS NULL`, populate `original_message` from `message_edit_history.old_text` (the most recent entry per message). Attachments deleted in the past are unrecoverable — those rows will show *"Attachment was permanently removed before evidence preservation was enabled"*.

## What buyers and vendors will see (unchanged)
- Their own chat windows continue to show "[message removed]" with no attachment, exactly as today.
- The new `original_*` columns are gated behind admin-only RPC, so privacy of "delete for everyone" is preserved between the two parties — only Barakaz admins, acting in a dispute/evidence capacity, can see the originals.

## Out of scope
- A user-facing "view original" button (intentional — this is admin-only dispute evidence).
- Restoring permanently-lost attachments from before this change.

## Files touched

```text
supabase/migrations/<timestamp>_preserve_deleted_message_evidence.sql   (new)
  - ALTER TABLE chat_messages ADD original_* columns
  - CREATE OR REPLACE FUNCTION delete_message_for_everyone (snapshot first)
  - CREATE OR REPLACE FUNCTION delete_message_for_me (snapshot first)
  - CREATE OR REPLACE FUNCTION admin_get_message_originals (admin-only)
  - Backfill from message_edit_history

src/pages/admin/AdminEvidence.tsx
  - Fetch originals via RPC after loading messages
  - ChatHistory: render preserved original text + attachment under deletion banner

src/pages/admin/AdminMessages.tsx
  - Fetch originals via RPC for the selected conversation
  - Render preserved original under the deletion flag
```

