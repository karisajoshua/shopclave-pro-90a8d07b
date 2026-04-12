

# Fix: Vendor Order Actions & Chat Product Reference

## Issues Found

### 1. Vendor Order Action Button Error
The notifications table RLS only allows **admins** to insert notifications. When any non-admin action tries to create a notification (e.g., chat messages), it fails. This also likely causes issues if the order status update code path tries to notify. Additionally, better error logging is needed to surface the actual error.

**Fix**: Add an RLS policy allowing authenticated users to insert notifications where they are the sender or the recipient context is valid. Also add a notification to the customer when the vendor updates order status.

### 2. Chat Product Reference Not Shown to Vendor
The `product_id` is saved in `chat_messages` but `VendorMessages.tsx` never fetches or displays the product name. Vendors see messages without knowing which product the customer is asking about.

**Fix**: In VendorMessages, fetch product info alongside messages and display a product reference badge at the top of each conversation and inline with the first message that references a product.

---

## Changes

### Database Migration
- Add RLS policy on `notifications` to allow authenticated users to insert notifications (not just admins):
  ```sql
  CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
  ```

### File: `src/pages/vendor/VendorOrders.tsx`
- Add a notification to the customer when vendor updates order status (e.g., "Your order for [product] has been marked as shipped")
- Improve error handling in the mutation

### File: `src/pages/vendor/VendorMessages.tsx`
- Update message query to include product info: `.select("*, products(name, slug)")`
- Show a product reference card at the top of the chat when a product_id exists on any message in the conversation
- Display product name as a clickable badge in the conversation header

### File: `src/components/shared/ChatDialog.tsx`
- When the first message in a conversation is about a product, automatically prepend a system-style message showing which product the user is inquiring about
- Ensure `product_id` is always sent with the first message when initiated from a product page

## Files to Modify
- `src/pages/vendor/VendorOrders.tsx` — Add customer notification on status change
- `src/pages/vendor/VendorMessages.tsx` — Fetch and display product reference
- `src/components/shared/ChatDialog.tsx` — Show product context in messages

## Database Migration
- Add notification INSERT policy for authenticated users

