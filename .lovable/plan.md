

# Customer order details + order confirmation email

Two changes for buyers: (1) make the customer dashboard show full order details (items, prices, delivery address, payment method, status), and (2) send a branded order-confirmation email automatically when an order is placed.

## 1. Customer dashboard — full order details

Today `/account` only shows order ID, date, total, status, and a Chat button. Buyers can't see what they actually ordered.

**Update `src/pages/AccountPage.tsx`:**
- Replace each compact order row with an expandable order card.
- Collapsed view (default): order ID, date, total, status badge, item count, "View details" toggle, Chat button.
- Expanded view shows:
  - **Items**: thumbnail, name, variant label (if any), quantity, unit price, line total — fetched via a join on `order_items` + `products` (name, image, vendor name from `vendors`).
  - **Delivery address**: full block from `orders.shipping_address` (name, phone, address line, city, country).
  - **Payment method**: friendly label ("Pay on Delivery", "Pay Vendor Directly", "M-Pesa", "Card") plus payment status.
  - **Order timeline**: pending → processing → shipped → delivered, current step highlighted.
- Add a single React Query that fetches orders **with** `order_items(*, products(name, images, vendor_id, vendors(store_name)))` so all data loads in one round-trip. RLS on `order_items` already restricts buyers to their own orders.
- Mobile: cards stack; expanded section uses smaller text and 2-column grid for item rows.

## 2. Order confirmation email

Send a branded email to the buyer immediately after `create-order` succeeds. The verified sender domain `notify.nyumbanifitnesssolutions.com` will be used.

**Infrastructure:**
- Set up the shared email queue infrastructure (one-time, idempotent).
- Scaffold the transactional-email edge function and template registry.
- Deploy the new edge functions.

**New template** `_shared/transactional-email-templates/order-confirmation.tsx`:
- Branded with Barakaz orange (`#ff420e`), white body, Inter/Arial.
- Sections: header ("Thanks for your order, {name}!"), order ID & date, itemized table (name, variant, qty, line total), totals (subtotal, delivery KSh 200, grand total), delivery address block, payment method, "Track your order" button linking to `/account` on `https://barakaz.com`, footer.
- Subject: `Your Barakaz order #XXXXXXXX is confirmed`.
- Props: `customerName`, `orderId`, `orderShortId`, `items[]`, `subtotal`, `deliveryFee`, `total`, `shippingAddress`, `paymentMethodLabel`, `trackUrl`.

**Trigger from `create-order` edge function** (server-side, not client) so it fires reliably even on slow client connections:
- After successful order + items insert, fetch product names for the line items, build `templateData`, and invoke `send-transactional-email` with:
  - `templateName: 'order-confirmation'`
  - `recipientEmail: user.email`
  - `idempotencyKey: order-confirm-${order.id}`
  - `templateData: { ... }`
- Email failure must NOT fail the order — wrap in try/catch and log only.

## Files touched

```text
src/pages/AccountPage.tsx                                         (rewrite cards)
supabase/functions/_shared/transactional-email-templates/
  registry.ts                                                     (new — added by scaffold)
  order-confirmation.tsx                                          (new)
supabase/functions/send-transactional-email/index.ts              (new — from scaffold)
supabase/functions/handle-email-unsubscribe/index.ts              (new — from scaffold)
supabase/functions/handle-email-suppression/index.ts              (new — from scaffold)
src/pages/EmailUnsubscribePage.tsx + route in App.tsx             (new)
supabase/functions/create-order/index.ts                          (invoke email after success)
```

## Out of scope
- Reordering / cancellation buttons on the dashboard.
- SMS notifications.
- Vendor "new order received" emails (can be added next if you want).

