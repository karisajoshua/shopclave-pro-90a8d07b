
# Fix vendor order status + chat threading/reference/counts

## What’s actually wrong

### 1) Vendor order status update is failing because of RLS policy shape
The `order_items` table has a vendor update policy with only a `USING` clause:

```sql
CREATE POLICY "Vendors can update their order items" ON public.order_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
);
```

For updates, Postgres can also require the **new row** to satisfy `WITH CHECK`. Since that is missing, status changes can fail with a row-level-security violation. The safest fix is to recreate the policy with both:
- `USING`: vendor can target their own row
- `WITH CHECK`: vendor can only write back rows still belonging to their own vendor

### 2) Product reference is still not reliable in chat because conversations are grouped too broadly
Current chat uses:
```ts
conversationId = `${user.id}_${vendorId}`
```

That means:
- all chats between one buyer and one vendor collapse into one thread
- product context gets mixed or lost
- vendor sees one combined thread instead of “one chat per product”

To match your requirement, conversation IDs should be product-specific, for example:
```text
{userId}_{vendorId}_{productId}
```
and only fall back to a general vendor chat if there is no product.

### 3) Vendor product reference UI is too indirect
Right now vendor chat loads messages with `select("*")` and then separately guesses a product from the first message with `product_id`. That is fragile. The product reference should be derived from the selected conversation itself and rendered clearly in:
- the conversation list
- the conversation header
- admin messages too

### 4) Message counts are only implemented for admin, not vendor/user
Admin already computes `messageCount`, but:
- vendor conversation list does not show total count
- user chat dialog does not show total count
- realtime updates do not consistently refresh count badges

## Implementation plan

### A. Fix the vendor order status RLS policy
Create a migration that:
- drops the current `Vendors can update their order items` policy
- recreates it with both `USING` and `WITH CHECK`
- scopes access to the vendor’s own `vendor_id`

Planned policy shape:
```sql
CREATE POLICY "Vendors can update their order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vendors
    WHERE vendors.id = order_items.vendor_id
      AND vendors.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vendors
    WHERE vendors.id = order_items.vendor_id
      AND vendors.user_id = auth.uid()
  )
);
```

This is the core fix for the row-level-security error.

### B. Make each product chat a separate conversation
Update `src/components/shared/ChatDialog.tsx` so conversation IDs become:
- product chat: `${user.id}_${vendorId}_${productId}`
- no-product chat fallback: `${user.id}_${vendorId}`

This makes every product inquiry its own thread.

### C. Preserve product reference on every reply in that thread
In both customer and vendor send handlers:
- when replying inside a selected product conversation, keep inserting the same `product_id`
- parse/store the selected conversation’s product context in component state instead of guessing from arbitrary messages

Files:
- `src/components/shared/ChatDialog.tsx`
- `src/pages/vendor/VendorMessages.tsx`
- `src/pages/admin/AdminMessages.tsx`

### D. Show product reference clearly in vendor/admin chat
Update conversation queries to include enough message fields to detect product-specific threads consistently.
For vendor/admin:
- extract `productId` from the conversation’s messages or conversation ID
- fetch related product details (`name`, `slug`)
- show the product name in the conversation list subtitle
- show “Re: Product Name” in the active chat header

Files:
- `src/pages/vendor/VendorMessages.tsx`
- `src/pages/admin/AdminMessages.tsx`

### E. Add visible message counts for vendor and user
Implement total message count in both sides:

#### Vendor inbox
For each conversation show:
- unread badge if unread > 0
- total message count label, e.g. `6 messages`

#### User chat dialog
Show:
- total message count in the header or above messages
- live updates as messages arrive

This will use the existing `messages.length` for the open thread and grouped counts in the vendor list.

Files:
- `src/pages/vendor/VendorMessages.tsx`
- `src/components/shared/ChatDialog.tsx`

### F. Keep realtime counts and read state in sync
When new messages arrive:
- append to the open thread if active
- invalidate/refetch grouped conversations so counts update
- keep unread counts accurate after marking messages as read

This needs a small cleanup in the vendor chat effect and the user dialog realtime handling.

## Files to update
- `supabase/migrations/...sql` — fix `order_items` vendor update policy
- `src/components/shared/ChatDialog.tsx` — product-specific conversation IDs, persistent product reference, user message count
- `src/pages/vendor/VendorMessages.tsx` — product-specific conversations, product reference display, total message count, realtime refresh
- `src/pages/admin/AdminMessages.tsx` — show product-specific threads and product reference consistently

## Technical notes
- No new table is required.
- Existing `chat_messages.product_id` is enough; the main issue is the current conversation ID design.
- The new thread-per-product behavior will apply to new chats. Old buyer-vendor chats without product-specific IDs can still remain readable as legacy threads.
- I will keep the RLS fix narrow and secure rather than using a permissive `true` update policy.
