

# Show order number on vendor Orders dashboard

## Problem
Vendor's Orders page lists each order item with product, buyer, qty, total, status, date — but no order number. Vendors can't easily reference an order when chatting with the buyer or admin, since the buyer sees an order number like `#A1B2C3D4` on their side.

## Fix
Display the short order ID (`#XXXXXXXX` — first 8 chars of `order_id`, matching the format used on Admin Orders and the buyer's order confirmation) on each row/card in `src/pages/vendor/VendorOrders.tsx`.

### Desktop table
Add a new leftmost column **"Order"** showing a monospace pill:
```
#A1B2C3D4
```
Style: `font-mono text-xs bg-muted px-2 py-1 rounded font-semibold` (same as Admin Orders for consistency). Clicking it copies the full order ID to clipboard with a toast — handy for support.

### Mobile card
Add the order number as a small chip at the top of each card, above the product name:
```
#A1B2C3D4                    [status pill]
Tunic Dress
[S / Black]
```

## Visual

```text
Vendor Orders (desktop) — new "Order" column
┌──────────┬─────────────────┬───────────┬─────┬───────┐
│ Order    │ Product         │ Deliver   │ Qty │ Total │
├──────────┼─────────────────┼───────────┼─────┼───────┤
│#A1B2C3D4 │ Tunic Dress     │ Jane Doe  │  1  │ KSh.. │
│          │ [S / Black]     │ ...       │     │       │
├──────────┼─────────────────┼───────────┼─────┼───────┤
│#E5F6G7H8 │ Leather Bag     │ John S.   │  1  │ KSh.. │
└──────────┴─────────────────┴───────────┴─────┴───────┘
```

## Files touched

```text
src/pages/vendor/VendorOrders.tsx
  - Desktop table: add "Order" column header + cell with #<short id> pill,
    click-to-copy
  - Mobile card: add #<short id> chip in the header row next to status
```

## Out of scope
- Admin Orders page — already shows `#XXXXXXXX`
- Renaming or changing the order ID format
- Filtering / search by order number (can be added later if needed)

