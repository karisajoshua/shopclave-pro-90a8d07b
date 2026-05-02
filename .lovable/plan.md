# Per-variant original & current price

Currently each product variant only stores a single `price` field. The product-level `compare_at_price` (original/strike-through price) is shared across all variants, so vendors can't show a different "was/now" price per variant.

## Changes

### 1. Database
Add `compare_at_price numeric` (nullable) to `public.product_variants` via migration. No data backfill needed — null falls back to product-level value.

### 2. Vendor product wizard — `src/pages/vendor/AddProductPage.tsx`
- Extend `VariantRow` interface with `compareAtPrice: string`.
- Initialize empty `compareAtPrice` when generating combinations.
- In the variant grid (Step 5, around line 540), change the 3-column grid to 4 columns and add a new field **"Original Price"** alongside the existing **"Current Price"** (rename "Price Override" → "Current Price"). Both placeholders fall back to the product-level values.
- On insert (line 229), include `compare_at_price: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null`.

### 3. Vendor edit page — `src/pages/vendor/EditProductPage.tsx`
- Mirror the same `VariantRow` change, hydrate `compareAtPrice` from existing variant rows (line 152), include it in the insert at line 320, and add the same UI field.

### 4. Product detail — `src/pages/ProductDetailPage.tsx`
- Update `displayPrice` and the discount/compare logic (lines 352–356 and the strike-through render around line 556) to prefer the selected variant's `compare_at_price` when present, falling back to the product-level value:
  ```ts
  const displayPrice = selectedVariant?.price ?? product?.price;
  const displayCompare = selectedVariant?.compare_at_price ?? product?.compare_at_price;
  ```
- Use `displayCompare` for the discount % and the struck-through original price.

### 5. No changes needed to
- `ProductCard` (uses product-level price only — variant pricing only matters on detail page).
- Cart/checkout (price is captured at add-to-cart time from the resolved variant price).
- `types.ts` (auto-regenerated from schema after migration).

## Out of scope
Bulk import templates won't get per-variant compare price (variants aren't supported in CSV import today).
