## Goal
When a buyer places an order, every vendor whose products are in that order automatically receives an email with their items, totals, buyer shipping details, and a link to manage the order.

## Approach
Reuse the existing Lovable Emails setup (`send-transactional-email`, queue, templates). Add one new vendor template and trigger sends from the existing `create-order` Edge Function — no new infrastructure, no schema changes.

Decisions (sensible defaults):
- Include full shipping details (name, phone, address) since this is a direct-to-vendor fulfillment model.
- Always on, no opt-out toggle for now.

## Steps

1. **New template** — `supabase/functions/_shared/transactional-email-templates/vendor-new-order.tsx`
   - React Email component mirroring `order-confirmation.tsx` brand styling (Barakaz logo, `#ff420e` accent, white body).
   - Props: `vendorName`, `storeName`, `orderShortId`, `orderDate`, `items` (only this vendor's items: name, variantLabel, qty, unitPrice, lineTotal), `vendorSubtotal`, `buyerName`, `shippingAddress`, `paymentMethodLabel`, `manageUrl` → `https://barakaz.com/vendor/orders`.
   - Subject: `New order #<shortId> on <storeName>`.

2. **Register template** — add `'vendor-new-order'` to `TEMPLATES` in `supabase/functions/_shared/transactional-email-templates/registry.ts`.

3. **Trigger sends in `create-order`** — `supabase/functions/create-order/index.ts`
   - After the existing buyer email block:
     - Batch-fetch `vendors` (id, store_name, user_id) for all vendor ids in the order.
     - Group `orderItems` by `vendor_id` and compute per-vendor subtotal + item list (using `productMap` for names).
     - For each vendor: resolve owner email via `adminClient.auth.admin.getUserById(user_id)`; skip with a warning if missing.
     - Invoke `send-transactional-email` with `templateName: 'vendor-new-order'`, `idempotencyKey: \`vendor-new-order-${order.id}-${vendor_id}\``, and the per-vendor `templateData`.
   - Wrap each send in try/catch + `console.error` — never fail the order on email failure (same pattern as buyer confirmation).

4. **Deploy** — `send-transactional-email` (registry change) and `create-order` (new trigger logic).

## Out of scope
- No vendor email-preference toggle.
- No changes to in-app notifications, buyer email, or order schema.
- No new tables, columns, or RLS changes.
