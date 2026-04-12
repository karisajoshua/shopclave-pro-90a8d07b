

# Plan: Direct-to-Vendor Orders, In-App Chat, and Vendor Upgrades

## Summary
Five major changes: (1) Restore Add to Cart / Buy Now buttons with orders going directly to vendors, (2) Let vendors add payment details customers see at checkout, (3) Add an in-app chat system between buyers and vendors, (4) Let vendors self-upgrade subscription tiers, (5) Admin can monitor all chats.

---

## 1. Database Changes

### Add vendor payment details
```sql
ALTER TABLE public.vendors ADD COLUMN payment_details jsonb DEFAULT '{}';
```
This stores vendor-specific payment info (M-Pesa till/paybill, bank details) shown to customers at checkout.

### Create chat messages table
```sql
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  sender_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
-- conversation_id = "{user_id}_{vendor_id}" for easy grouping
-- RLS: users can read/write own conversations, vendors can read/write their vendor conversations, admins can read all
```

Enable realtime for chat_messages.

### Subscription plans table (already exists)
No schema change needed — vendors will use the existing `vendor_subscriptions` table with a self-serve upgrade UI.

---

## 2. Product Detail Page — Restore Buy Now + Add to Cart + Chat Now

**File: `src/pages/ProductDetailPage.tsx`**
- Add back "Add to Cart" and "Buy Now" buttons in the center product info section (after variant selectors)
- Add "Chat Now" button in the SellerInfoSidebar below WhatsApp button
- Keep existing Call/WhatsApp/Website contact buttons
- Floating mobile bar: Add to Cart + Buy Now (restore) alongside Call/WhatsApp
- "Buy Now" adds to cart and navigates to checkout
- Chat Now opens in-app chat dialog/page

## 3. Checkout Page — Show Vendor Payment Details

**File: `src/pages/CheckoutPage.tsx`**
- In the payment step, fetch vendor payment details for each vendor in the cart
- Display vendor-specific payment instructions (e.g., M-Pesa till number, bank account) grouped by vendor
- Payment method defaults to "Pay on Delivery" with option to see vendor payment details
- Orders still go through the existing `create-order` edge function — orders are vendor-scoped

## 4. Vendor Settings — Payment Details

**File: `src/pages/vendor/VendorSettings.tsx`**
- Add a "Payment Details" section where vendors can enter:
  - M-Pesa Till/Paybill number
  - Bank name + account number
  - Custom payment instructions
- Saved to the `payment_details` jsonb column

## 5. Vendor Subscription Upgrade

**File: `src/pages/vendor/VendorDashboard.tsx`** (or new `VendorSubscription.tsx`)
- Show current plan with upgrade options
- Display available tiers (fetched from platform_settings or hardcoded initially)
- "Request Upgrade" button that creates a notification to admin
- Admin approves and updates the subscription via AdminSubscriptions page

## 6. In-App Chat System

### New Files:
- `src/pages/vendor/VendorMessages.tsx` — Vendor inbox showing all customer conversations, unread indicators
- `src/components/shared/ChatDialog.tsx` — Reusable chat component (modal or inline) for sending/receiving messages

### Product Detail Page:
- "Chat Now" button opens ChatDialog with the vendor, pre-filled with product context

### Vendor Sidebar:
- Add "Messages" nav item to VendorSidebar

### Vendor Notifications:
- When a new chat message arrives, insert a notification for the vendor

## 7. Admin Chat Monitoring

### New File:
- `src/pages/admin/AdminMessages.tsx` — View all conversations, filter by replied/unreplied status, read-only view of messages

### Admin Sidebar:
- Add "Messages" nav item

### App.tsx:
- Add routes: `/vendor/messages`, `/admin/messages`

---

## Files to Create
- `src/components/shared/ChatDialog.tsx`
- `src/pages/vendor/VendorMessages.tsx`
- `src/pages/admin/AdminMessages.tsx`

## Files to Modify
- `src/pages/ProductDetailPage.tsx` — Restore cart/buy buttons + add Chat Now
- `src/pages/CheckoutPage.tsx` — Show vendor payment details
- `src/pages/vendor/VendorSettings.tsx` — Add payment details fields
- `src/pages/vendor/VendorDashboard.tsx` — Subscription upgrade UI
- `src/components/vendor/VendorSidebar.tsx` — Add Messages nav
- `src/components/admin/AdminSidebar.tsx` — Add Messages nav
- `src/App.tsx` — Add new routes
- `src/components/marketplace/ProductCard.tsx` — Restore Add to Cart button (already present)

## Database Migration
- Add `payment_details` column to `vendors`
- Create `chat_messages` table with RLS policies
- Enable realtime on `chat_messages`

