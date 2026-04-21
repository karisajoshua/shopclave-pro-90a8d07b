

# Fit vendor Orders table — make all columns visible

## Problem
After adding the "Order" column, the vendor Orders desktop table now has 9 columns. At common laptop widths (~1000px sidebar+content), the rightmost columns ("Date", "Action") get clipped or pushed off-screen. The user wants every column visible without horizontal scroll.

## Fix (in `src/pages/vendor/VendorOrders.tsx`, desktop table only)

Tighten the table so it fits in the available width by removing redundant whitespace and merging low-value cells.

### Changes

1. **Merge "Date" into the "Order" cell**
   Show the date as a small muted line right under the order number pill. Drop the standalone "Date" column.
   ```
   #A1B2C3D4
   12 Apr 2026
   ```

2. **Move "Payment" pill under the "Total" cell**
   Total and payment status belong together (money column). Drop the standalone "Payment" column.
   ```
   KSh 2,400
   [paid]
   ```

3. **Shrink "Action" column footprint**
   - Drop `min-w-[140px]` on the action wrapper.
   - Put "Mark next" + "Chat" side-by-side (icon-only chat button with tooltip) instead of stacked.
   - Use `whitespace-nowrap` only where needed.

4. **Tighten "Deliver to"**
   Reduce `min-w-[260px]` → `min-w-[200px]`. Address still wraps cleanly.

5. **Keep `overflow-x-auto`** as a safety net for very narrow vendor sidebars, but the default 1000px+ layout will fit all 7 remaining columns.

### Resulting columns (7 instead of 9)
```
Order (+ date) | Product (+ variant) | Deliver to | Qty | Total (+ payment) | Status | Action
```

## Visual

```text
┌──────────┬───────────────┬───────────┬─────┬──────────┬─────────┬──────────────┐
│ Order    │ Product       │ Deliver   │ Qty │ Total    │ Status  │ Action       │
├──────────┼───────────────┼───────────┼─────┼──────────┼─────────┼──────────────┤
│#A1B2C3D4 │ Tunic Dress   │ Jane Doe  │  1  │ KSh 2,400│ pending │ [Mark proc.] │
│12 Apr    │ [S / Black]   │ ...       │     │ [paid]   │         │ [💬]         │
└──────────┴───────────────┴───────────┴─────┴──────────┴─────────┴──────────────┘
```

## Out of scope
- Mobile card layout (already fits — no change)
- Admin Orders page
- Adding filtering/search
- Changing data shown (all info preserved, just reorganized)

