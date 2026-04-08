

# Plan: Multi-Image Variants, Mobile Layout Fix, and Buy Now Fix

## Summary
Three changes: (1) Allow vendors to upload multiple images per variant, (2) Reorder mobile product page so buy box appears before description, (3) Fix blank screen on Buy Now/Add to Cart on mobile.

---

## 1. Multiple Images Per Variant

**Current state**: `VariantRow` has a single `imageFile`/`imagePreview`. The `product_variants` table has a single `image_url` column.

**Approach**: Change the variant image model from a single image to multiple images. Store variant images in the `product_images` table with a `variant_id` reference instead of a single `image_url` column on `product_variants`.

**Database migration**:
```sql
ALTER TABLE product_images ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;
```

**Files to modify**:
- `src/pages/vendor/AddProductPage.tsx` — Change `VariantRow` to support `imageFiles: File[]` and `imagePreviews: string[]`. Replace single image upload button with multi-image upload per variant row. On submit, upload all variant images to `product_images` with `variant_id` set.
- `src/pages/vendor/EditProductPage.tsx` — Same multi-image support for variants when editing.
- `src/pages/ProductDetailPage.tsx` — When a color variant is selected, filter `product_images` by `variant_id` to show only that variant's images in the gallery. Fall back to product-level images (where `variant_id` is null) if the variant has no images.

## 2. Mobile Layout: Buy Box Before Description

**Current state**: The 3-column grid collapses to a single column on mobile. Order is: gallery + description (left col) -> buy box (center col) -> seller info (right col). This means description appears before price/buttons on mobile.

**Fix in `src/pages/ProductDetailPage.tsx`**: Restructure the mobile layout using CSS `order` classes:
- On mobile (`lg:` breakpoint), reorder so the flow is: Gallery -> Buy Box (title, price, variants, buttons) -> Description -> Seller Info -> Reviews
- Use `order-1`, `order-2`, `order-3` on mobile with `lg:order-none` to restore desktop order
- Alternatively, split the left column into two divs (gallery and description) and use responsive ordering

## 3. Fix Blank Screen on Buy Now (Mobile)

**Root cause**: The `useEffect` in `CheckoutPage.tsx` runs on mount and sees `items.length === 0` before React has re-rendered with the updated cart state from `addItem`. Even though `saveCart` writes to localStorage and `addItem` updates state, the navigation happens via `setTimeout` 50ms later — but `CheckoutPage` mounts, reads the initial state, and redirects to `/cart` before the state update propagates.

**Fix**:
- In `CheckoutPage.tsx`: Instead of redirecting when `items.length === 0` on first render, add a guard that skips the first render cycle. Use a ref to track if the component just mounted and only redirect after a brief delay, or check localStorage directly as a fallback.
- Better approach: Pass a flag via `navigate("/checkout", { state: { fromBuyNow: true } })` and skip the empty-cart redirect when that flag is present for the first render.

---

## Technical Details

### Database Migration
- Add `variant_id` column to `product_images` table

### Files to Modify
- `src/pages/vendor/AddProductPage.tsx` — Multi-image per variant
- `src/pages/vendor/EditProductPage.tsx` — Multi-image per variant  
- `src/pages/ProductDetailPage.tsx` — Mobile layout reorder + variant image filtering
- `src/pages/CheckoutPage.tsx` — Fix redirect race condition

