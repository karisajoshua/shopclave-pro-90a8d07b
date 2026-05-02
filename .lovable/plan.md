# Fix per-variant pricing UI + preserve size order

Two issues to resolve:

1. **Per-variant Original/Current price fields aren't visible/usable** when adding or editing a product. The fields exist in code but the 4-column grid (`grid-cols-2 sm:grid-cols-4`) cramps them on narrow widths and the labels (`text-[10px]`) are nearly invisible, so vendors think the option is missing.
2. **Size (and other option) values display in a different order on the storefront** than the order the vendor entered them. The detail page builds option lists by scanning variants — order is influenced by combination iteration, not by the vendor's original value order.

## Changes

### 1. Vendor variant grid — `AddProductPage.tsx` & `EditProductPage.tsx`
Make the per-variant pricing UI obvious and easy to fill:
- Replace the cramped 4-col row with a clearer 2-column layout per variant card:
  - Row 1: **Original Price (KSh)** + **Current Price (KSh)** side by side, full-size inputs (not `h-8 text-xs`).
  - Row 2: **Stock** + **SKU**.
- Use full `Label` styling (not `text-[10px]`) and add helper text under the prices: *"Leave Original Price empty for no discount. Current Price falls back to the product price if blank."*
- Keep placeholders showing the product-level fallback values.
- No data-model change — `compare_at_price` already exists on `product_variants`.

### 2. Preserve vendor-defined option value order — `ProductDetailPage.tsx`
Currently `optionTypes` is built by iterating every variant and `Set`-adding values, which yields combination-iteration order rather than the vendor's input order.

Fix: derive each option's values from the **first variant containing that key** as the canonical seed, then walk variants in `created_at` order (already sorted) and append any new values in the order encountered. Since variant rows are inserted in the same sequence the vendor generated them, the first row's `Size` value is the vendor's first size, and so on. Specifically:
```ts
const types: Record<string, string[]> = {};
variants.forEach((v) => {
  Object.entries(v.variant_options as Record<string,string>).forEach(([k, val]) => {
    if (!types[k]) types[k] = [];
    if (!types[k].includes(val)) types[k].push(val);
  });
});
```
This guarantees the storefront shows Size/Color chips in the exact order the vendor added values in the wizard.

### 3. Optional polish
- On the variant chip row in the detail page, ensure the order of **option types** (Size vs Color) also matches the vendor: iterate keys from the first variant's `variant_options` object first, then append any extra keys.

## Out of scope
- No DB migration.
- No changes to cart, checkout, or `ProductCard` (variant pricing only matters on the detail page).
- Bulk import templates remain unchanged.
