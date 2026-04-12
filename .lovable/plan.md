

# Fix: Add to Cart / Buy Now Buttons Disappearing

## Root Cause
Line 322: `const displayStock = hasVariants ? (selectedVariant?.stock ?? 0) : product?.stock;`

When `hasVariants` is true but `selectedVariant` is `null` (during initial render before auto-selection completes, or during option changes), `displayStock` evaluates to `0`, causing the conditional on line 563 `{(displayStock ?? 0) > 0 && ...}` to hide the buttons.

## Fix
1. **Change `displayStock` fallback** in `ProductDetailPage.tsx` line 322: when `hasVariants` is true but no variant is selected, fall back to `product?.stock` instead of `0`
2. **Show buttons even when stock is unknown**: change the conditional to also show buttons when stock is `undefined`/`null` (not yet loaded), only hiding them when stock is explicitly `0`
3. Apply the same logic to the **floating mobile bar** (line 652)

## Files to Modify
- `src/pages/ProductDetailPage.tsx` — Fix stock fallback and conditional rendering

