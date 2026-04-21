

# Fix: buyer can't see vendor's reply in order chat

## Root cause

When the vendor replies from `/vendor/messages`, the inserted row in `chat_messages` has `order_id = NULL` even when the conversation is an order thread (`conversation_id = order_<orderId>`).

The buyer-side chat (`OrderChatPage`) only loads messages it can see under RLS. The relevant SELECT policy for an order thread is:

```
Participants view order-linked messages
  USING (order_id IS NOT NULL AND (buyer of order OR vendor of order_items))
```

Because the vendor's reply has `order_id = NULL`, **that policy doesn't match**, so the row is invisible to the buyer. The buyer sees their own messages (which carry `order_id`) but not the vendor's reply.

Confirmed in the database — for order `58126f08…`:
- Buyer rows: `order_id = 58126f08…` ✅
- Vendor reply rows: `order_id = NULL` ❌

## Fix — two parts

### 1. Vendor reply must preserve `order_id`
In `src/pages/vendor/VendorMessages.tsx`, the conversation list is grouped by `conversation_id`. When grouping, we already capture `product_id`. Do the same for `order_id`, and:

- Store `order_id` on each grouped conversation (first non-null wins, same pattern as `product_id`)
- Also derive it as a fallback from the `conversation_id` itself when it starts with `order_` (format is `order_<uuid>`)
- In `handleSend`, include `order_id` on the insert payload whenever the selected conversation has one

This makes vendor replies satisfy the buyer's RLS policy.

### 2. Backfill the broken vendor replies
For existing rows where `conversation_id LIKE 'order_%'` AND `order_id IS NULL`, set `order_id` from the conversation_id suffix. This unblocks the buyers who already lost messages (e.g. order `58126f08…`).

```sql
UPDATE chat_messages
SET order_id = substring(conversation_id from 'order_(.*)')::uuid
WHERE conversation_id LIKE 'order_%'
  AND order_id IS NULL;
```

## Optional hardening (small + worth it)
Show order-thread previews in the vendor inbox more cleanly: when a conversation has an `order_id`, render a small "Re: Order #XXXXXXXX" badge above the preview line (mirrors how product threads show "Re: <product name>"). This is low risk because we're already fetching `order_id` in the same query.

## Files touched

```text
src/pages/vendor/VendorMessages.tsx
  - In conversations query: capture orderId per conversation
    (from msg.order_id, fall back to conversation_id 'order_<uuid>' parse)
  - In handleSend: include order_id when the selected conversation has one
  - (optional) show small "Re: Order #XXXXXXXX" chip in conversation list
    and chat header

(one-off migration / SQL) backfill chat_messages.order_id where
  conversation_id LIKE 'order_%' AND order_id IS NULL
```

## Out of scope
- Realtime subscription rewrite (current setup already works once RLS allows the row through)
- Buyer composer changes (already correct)
- Notifications, dispute flow

