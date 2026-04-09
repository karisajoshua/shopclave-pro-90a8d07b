

# Plan: Variant Images, Category Depth, Search Suggestions, and Countdown Timer

## Summary
Fix five issues: (1) Speed up product saving by parallelizing uploads, (2) Show all variant images for a selected color across sizes, (3) Support deep category hierarchies in vendor product form, (4) Add search autocomplete with category/product suggestions, (5) Add admin-controlled countdown timer on products.

---

## 1. Speed Up Product Saving

**Problem**: Images upload sequentially in a `for` loop — each waits for the previous one.

**Fix in `AddProductPage.tsx` and `EditProductPage.tsx`**: Replace sequential `for` loops in `uploadImages` and `uploadVariantImages` with `Promise.all` for parallel uploads. This will dramatically reduce save time when there are many images.

```typescript
// Before: sequential
for (const file of files) { await upload(file); }
// After: parallel
await Promise.all(files.map(file => upload(file)));
```

## 2. Fix Variant Image Display (Show All Images for a Color)

**Problem**: The gallery filters by `selectedVariant.id` (one specific Colour+Size combo), so it shows only that combo's images. User wants ALL images for all variants of the same **color**.

**Fix in `ProductDetailPage.tsx`**: Instead of filtering `product_images` by `selectedVariant.id`, find all variant IDs that share the same color value as the selected variant, then show all their images.

```typescript
// Collect all variant IDs sharing the selected color
const colorKey = Object.keys(optionTypes).find(k => k.toLowerCase().includes('col'));
const selectedColor = selectedOptions[colorKey];
const matchingVariantIds = variants
  .filter(v => v.variant_options[colorKey] === selectedColor)
  .map(v => v.id);
const variantImages = allImages.filter(img => matchingVariantIds.includes(img.variant_id));
```

**Fix in `ProductGallery.tsx`**: Reset `activeIndex` to 0 when the `images` array changes (via `useEffect`) so switching colors always starts from the first image.

## 3. Deep Category Hierarchy (Recursive Selector)

**Problem**: `categoryOptions` in `AddProductPage.tsx` only builds 3 levels (top → child → grandchild). Categories can go 4-5 levels deep.

**Fix**: Replace the manual 3-level nesting with a recursive function that walks the full tree:

```typescript
const buildCategoryTree = (parentId: string | null, depth: number): {id: string; label: string}[] => {
  const children = categories.filter(c => c.parent_id === parentId);
  const result = [];
  for (const child of children) {
    result.push({ id: child.id, label: '  '.repeat(depth) + (depth > 0 ? '└ ' : '') + child.name });
    result.push(...buildCategoryTree(child.id, depth + 1));
  }
  return result;
};
```

Apply same fix in `EditProductPage.tsx`.

## 4. Search Autocomplete Suggestions

**Modify `Navbar.tsx`**: Add a dropdown below the search input that shows live suggestions as the user types:
- Query `categories` table for matching category names (debounced, 300ms)
- Query `products` table for matching product names (limit 5, active only)
- Show results in a dropdown with sections: "Categories" and "Products"
- Clicking a category goes to `/search?category=<slug>`, clicking a product goes to `/product/<slug>`
- Close dropdown on blur or selection

No new components needed — built inline with a `useState` for suggestions and a `useEffect` with debounce.

## 5. Countdown Timer (Deal Ends At)

**Database migration**:
```sql
ALTER TABLE public.products ADD COLUMN deal_ends_at timestamptz;
```

**Admin UI — `AdminProducts.tsx`**: Add a "Set Deal Timer" action per product. Show a date-time picker dialog to set `deal_ends_at`. Admin can also clear it.

**Product display — `ProductDetailPage.tsx`**: Show a countdown banner above the price when `deal_ends_at` is set and in the future. Display days/hours/minutes/seconds with a live-updating `useEffect` interval.

**Product card — `ProductCard.tsx`**: Show a small countdown badge on cards for products with active deals.

---

## Technical Details

### Database Migration
```sql
ALTER TABLE public.products ADD COLUMN deal_ends_at timestamptz;
```

### Files to Modify
- `src/pages/vendor/AddProductPage.tsx` — Parallel uploads + recursive categories
- `src/pages/vendor/EditProductPage.tsx` — Same parallel uploads + recursive categories
- `src/pages/ProductDetailPage.tsx` — Color-based image filtering + countdown timer
- `src/components/product/ProductGallery.tsx` — Reset activeIndex on images change
- `src/components/layout/Navbar.tsx` — Search autocomplete dropdown
- `src/pages/admin/AdminProducts.tsx` — Deal timer date-time picker
- `src/components/marketplace/ProductCard.tsx` — Countdown badge

### No New Dependencies
All built with existing components (shadcn Dialog, Input, Popover).

