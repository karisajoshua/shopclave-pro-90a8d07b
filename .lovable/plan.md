

# Show variant (size / color) on vendor + admin order views

## Problem
When customers order a product with size/color, the chosen variant **is** saved on `order_items.variant_options.label` (e.g. `"S / Black"`, `"29cm*12cm*22cm(Medium) / Red Wine"`), and it's already shown to the buyer on `/account`. But the **vendor orders page** and **admin orders page** don't display it, so vendors can't tell which size/color to ship.

## Fix

### 1. Vendor `Orders` page — `src/pages/vendor/VendorOrders.tsx`
Render the variant label right under each product name, in a small primary-tinted chip. Applies to both the desktop table and the mobile card.

- Desktop table, "Product" cell:
  ```
  Tunic Dress
  [ S / Black ]
  ```
- Mobile card, header line: same chip under the product name.
- Read from `item.variant_options?.label` with a safe fallback (no chip when no variant).

### 2. Admin `Orders` page — `src/pages/admin/AdminOrders.tsx`
In the expanded order's items table, add the variant label next to the product name in the "Product" column (same chip style). No new column — keeps the existing layout.

### 3. (Defensive) Order chat header / order confirmation page
Already correct — the buyer-facing order confirmation email and `AccountPage` already render `variant_options.label`. No change needed.

## Visual

```text
Vendor Orders (desktop)
┌─────────────────────────────┬───────────────┬─────┐
│ Product                     │ Deliver to    │ Qty │
├─────────────────────────────┼───────────────┼─────┤
│ Tunic Dress                 │ Jane Doe      │  1  │
│ [S / Black]                 │ ...           │     │
├─────────────────────────────┼───────────────┼─────┤
│ Leather Bag                 │ John Smith    │  1  │
│ [29cm*12cm*22cm / Red Wine] │ ...           │     │
└─────────────────────────────┴───────────────┴─────┘
```

Chip style: `text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium` — matches existing status pills, doesn't add visual weight.

## Files touched

```text
src/pages/vendor/VendorOrders.tsx
  - Desktop "Product" cell: render variant_options.label chip below name
  - Mobile card header: render same chip below name

src/pages/admin/AdminOrders.tsx
  - Expanded items table, "Product" cell: render variant_options.label
    chip next to product name
```

## Out of scope
- Schema changes (data is already saved correctly)
- Buyer side (already shows the label on /account and confirmation email)
- Pulling per-attribute breakdown (`size: S, color: Black`) — only the combined `label` is stored today; that's sufficient for fulfilment. Splitting into separate columns would require also reading `product_variants.variant_options` per row, which isn't worth it for the gain.

