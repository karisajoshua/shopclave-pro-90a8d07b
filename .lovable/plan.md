

# Plan: Product Reference on Vendor Side + Message Count Badge in Sidebar

## Changes

### 1. VendorSidebar — Show unread message count badge on "Messages" nav item
- Convert `VendorSidebar` to query `chat_messages` for unread count where `vendor_id` matches and `sender_id != user.id` and `is_read = false`
- Display a red badge with the count next to the "Messages" label
- Use `useAuth` to get user ID and a lightweight query for the vendor's unread count

### 2. VendorMessages — Product reference as clickable link (already partially there)
- The product reference header (line 204-211) already shows a clickable link — this is working correctly in the code
- The conversation list (line 181-185) shows product name but NOT as a link — will keep it as text in the list (clicking opens the conversation)
- Ensure the product reference in the chat header is prominent and clearly clickable

### 3. ChatDialog (client side) — Make product reference a clickable link
- Line 151-155: Change `<span>` to an `<a>` tag linking to `/product/{slug}` so the product name is clickable
- Need to pass `productSlug` prop or derive it — since we have `productId`, we can construct the link using the product slug passed as a prop

### Files to modify
- `src/components/vendor/VendorSidebar.tsx` — Add unread message count badge
- `src/components/shared/ChatDialog.tsx` — Make product reference a clickable link (add `productSlug` prop)
- `src/pages/vendor/VendorMessages.tsx` — Ensure product link in chat header is visible and working (already in place, minor styling enhancement)

### Technical details
- VendorSidebar will need access to vendor ID. It will query `chat_messages` with a `useQuery` hook filtered by unread status. This requires knowing the vendor — will fetch it via `useAuth` + vendors table lookup.
- The badge will show the total unread count and auto-refresh via the query's refetch interval or realtime subscription.
- ChatDialog already receives `productName` — will add optional `productSlug` prop for the link target. The caller (ProductDetailPage) already has the product slug available.

