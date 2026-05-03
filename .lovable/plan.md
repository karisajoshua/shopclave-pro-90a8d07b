## Plan

I found the main issue: the product page keeps old variant selections in local state when you move between products that share similar option names like `Size`. Because of that, the next product can fail to resolve the correct variant and falls back to the base product price, making it look like per-variant before/after pricing only works for one product.

I also confirmed the backend already supports this correctly:
- `product_variants.compare_at_price` exists in the database
- the product detail page already reads variant `price` and `compare_at_price`
- the problem is in the frontend variant-selection lifecycle, not the schema

## What I’ll change

### 1. Reset variant selections per product on the detail page
Update `src/pages/ProductDetailPage.tsx` so variant option state is rebuilt whenever the product or variant list changes.

This will:
- clear stale selections from the previous product
- initialize defaults from the current product’s actual variant values
- remove invalid carried-over values when two products both use labels like `Size`, `Color`, etc.

### 2. Make selected variant resolution stricter and more reliable
Refactor the matching logic so the selected variant is resolved against the current product’s full option set, not leftover partial state.

This will ensure:
- each similar product gets its own correct variant
- `displayPrice` uses that product’s selected variant price
- `displayCompare` uses that product’s selected variant original price
- discount badges/strike-through pricing appear consistently for every qualifying product

### 3. Keep variant option order intact
Preserve the vendor-defined option/value order while making the reset logic safe, so the previous size-order fix is not lost.

### 4. Bring the edit screen in line with the add screen
The edit page is still using the older cramped variant pricing layout. I’ll update `src/pages/vendor/EditProductPage.tsx` so vendors can clearly see and edit:
- Original Price
- Current Price
- Stock
- SKU

This keeps add/edit behavior consistent and avoids the impression that variant before/after prices are missing on edit.

## Expected result

After this fix:
- any product with variant-level current/original prices will show them correctly on the storefront
- switching between similar products will no longer reuse the previous product’s selected options
- the correct strike-through price and discount will appear per selected variant
- vendors will be able to clearly edit variant before/after prices on existing products

## Technical details

Files to update:
- `src/pages/ProductDetailPage.tsx`
- `src/pages/vendor/EditProductPage.tsx`

Implementation notes:
- replace the current `useMemo` side-effect used for initializing `selectedOptions` with a proper `useEffect`
- key the reset to the current product/variant set so state does not leak across products
- normalize selected options against `optionTypes` before resolving `selectedVariant`
- preserve first-seen variant option/value ordering from the current product’s variants
- no database migration required

If you approve, I’ll apply the fix.