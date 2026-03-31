

# Plan: Vendor Product Edit, Variant Image Switching, and Review Fix

## Summary
Three fixes: (1) Add edit product capability to vendor dashboard, (2) Link variant images so selecting a color switches the product gallery, (3) Fix the review system so customers can actually submit reviews.

---

## 1. Vendor Product Edit

**Current state**: VendorProducts page only has delete/status toggle — no edit button. AddProductPage only creates new products.

**Approach**: Create a new `EditProductPage` that loads existing product data and allows updating all fields (name, description, price, category, images, variants, video). Add an edit button to VendorProducts and register the route.

### Files
- **Create** `src/pages/vendor/EditProductPage.tsx` — Clone of AddProductPage but pre-populates from existing product, uses `.update()` instead of `.insert()`, handles existing images alongside new uploads, and updates/replaces variants
- **Modify** `src/pages/vendor/VendorProducts.tsx` — Add an Edit (Pencil) button linking to `/vendor/products/edit/:id`
- **Modify** `src/App.tsx` — Add route `products/edit/:id` under vendor layout

## 2. Variant Image Switching (Color Selection Changes Gallery)

**Current state**: `product_variants` has no image reference. The gallery shows all product images regardless of selected variant.

**Approach**: Add an `image_url` column to `product_variants` so vendors can assign a specific image to each variant. On the product detail page, when a color variant is selected and has an `image_url`, scroll the gallery to that image or show it as the active image.

### Database Migration
```sql
ALTER TABLE product_variants ADD COLUMN image_url text;
```

### Files
- **Modify** `src/pages/vendor/AddProductPage.tsx` — Add optional image upload per variant row
- **Modify** `src/pages/vendor/EditProductPage.tsx` (new file) — Same variant image support
- **Modify** `src/pages/ProductDetailPage.tsx` — When a color option is selected, find the matching variant's `image_url` and set it as the active gallery image
- **Modify** `src/components/product/ProductGallery.tsx` — Accept an `activeImageUrl` prop that forces a specific image to display

## 3. Fix Review System

Two bugs preventing reviews from working:

**Bug A — Profile fetching fails due to RLS**: The `ProductReviews` component fetches profiles for review authors using `.in("user_id", userIds)`, but the `profiles` RLS only allows users to see their *own* profile. Non-admin users see empty reviewer names.

**Fix**: Create a `profiles_public` view (or add an RLS policy allowing SELECT on profiles for authenticated users — limited to `full_name` and `avatar_url`). Simplest: add a public SELECT policy on profiles that only exposes `full_name` and `avatar_url`, or create a security-definer function to fetch public profile data.

**Bug B — canReview query may fail**: The query uses `orders!inner(status, user_id)` on `order_items`, but `order_items` RLS requires the user to own the order or be the vendor. This should work for the buyer since "Users can view own order items" policy checks `orders.user_id = auth.uid()`. However, the join syntax `orders!inner(...)` might not work correctly without a foreign key. Need to verify and potentially rewrite as a simpler two-step query.

### Database Migration
```sql
-- Option: Create a security definer function to get public profile info
CREATE OR REPLACE FUNCTION public.get_public_profiles(user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(user_ids);
$$;
```

### Files
- **Modify** `src/components/product/ProductReviews.tsx`:
  - Use `rpc('get_public_profiles', { user_ids: [...] })` instead of direct profiles query
  - Simplify `canReview` check: first query user's orders with delivered status, then check if any order_item has the current product_id

---

## Technical Details

### New Route
- `/vendor/products/edit/:id` → `EditProductPage`

### Database Changes
1. `ALTER TABLE product_variants ADD COLUMN image_url text;`
2. `CREATE FUNCTION get_public_profiles(...)` — security definer for public profile data

### Files to Create
- `src/pages/vendor/EditProductPage.tsx`

### Files to Modify
- `src/pages/vendor/VendorProducts.tsx` (add edit button)
- `src/App.tsx` (add edit route)
- `src/pages/vendor/AddProductPage.tsx` (variant image upload field)
- `src/pages/ProductDetailPage.tsx` (variant image switching)
- `src/components/product/ProductGallery.tsx` (accept forced active image)
- `src/components/product/ProductReviews.tsx` (fix profile fetch + canReview logic)

