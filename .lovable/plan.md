

# Show full delivery address to sellers and fix the "Mark processing" error

## Two issues, two fixes

### 1. The "Mark processing" error
The database `order_items.status` and `orders.status` columns both have a CHECK constraint that only allows: `pending | confirmed | shipped | delivered | cancelled`. The vendor UI tries to set status to **`processing`**, which is rejected — this is the error sellers see.

**Fix**: Migrate the CHECK constraints on both `order_items.status` and `orders.status` to also accept `processing`. New allowed set: `pending | confirmed | processing | shipped | delivered | cancelled`. The order-status sync function already references `'processing'`, so this aligns the schema with the existing logic and the UI flow.

### 2. Sellers can't see the full delivery address
The order is saved with the full `shipping_address` JSON (`fullName`, `phone`, `addressLine`, `city`, `country`), but `VendorOrders.tsx` only renders **name + city + phone**. The street address and country are hidden, so sellers can't actually deliver.

**Fix**: Update `src/pages/vendor/VendorOrders.tsx` so the Customer cell (desktop) and the order card (mobile) display the complete delivery block:

```text
Jane Doe
+254 712 345 678
12 Riverside Drive, Apt 4B
Nairobi, Kenya
```

On desktop, broaden the Customer column and stack the lines vertically. On mobile, show the address as its own labelled block ("Deliver to:") under the customer name, with a small "Copy address" button (clipboard icon) so the seller can paste it into a courier app or WhatsApp.

## Files touched

```text
supabase/migrations/<timestamp>_allow_processing_order_status.sql   (new)
  - ALTER TABLE order_items DROP CONSTRAINT order_items_status_check,
    ADD CHECK status IN (pending, confirmed, processing, shipped, delivered, cancelled)
  - Same for orders.status

src/pages/vendor/VendorOrders.tsx
  - Customer cell: render fullName, phone, addressLine, "city, country"
  - Mobile card: dedicated "Deliver to" block + Copy-address button
```

## Out of scope
- Changing the status flow itself (still pending → processing → shipped → delivered).
- Notifying buyers of address changes (addresses are immutable on an order today).
- Admin orders page (already shows shipping_address in its own view).

