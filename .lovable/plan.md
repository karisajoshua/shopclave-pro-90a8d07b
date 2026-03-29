

## Multi-Image & Video Support for Products

### Overview
Replace the single image URL field with a multi-image uploader (using Supabase Storage) and add a video URL field for YouTube/Vimeo embeds, for both vendor and admin product management.

### Database Changes

**Add `video_url` column to `products` table:**
```sql
ALTER TABLE public.products ADD COLUMN video_url text;
```

No other schema changes needed — `product_images` table already supports multiple images per product with positioning.

### File Changes

**1. `src/pages/vendor/AddProductPage.tsx`**
- Replace single "Image URL" input with a multi-image upload section:
  - File input that uploads to the `product-images` Supabase Storage bucket
  - Show thumbnails with drag-reorder or position numbers and delete buttons
  - Support uploading multiple files at once
- Add a "Video URL" input field (YouTube or Vimeo link) below images
- On submit: insert multiple rows into `product_images` table with position, save `video_url` on the product

**2. `src/pages/admin/AdminProducts.tsx`**
- Add an "Edit" action button that opens a dialog/modal for the product
- The modal includes the same multi-image uploader and video URL field
- Admin can add/remove images and set/update the video URL

**3. `src/pages/ProductDetailPage.tsx`**
- Update the image gallery to be interactive: clicking thumbnails swaps the main image
- If `product.video_url` exists, show a video embed (YouTube/Vimeo iframe) as the last item in the gallery or as a separate tab/section below images
- Parse YouTube (`youtube.com/watch?v=` or `youtu.be/`) and Vimeo (`vimeo.com/`) URLs to generate proper embed URLs

### Implementation Order
1. Database migration — add `video_url` column to products
2. Update AddProductPage — multi-image upload to Storage + video URL field
3. Update AdminProducts — add edit modal with image/video management
4. Update ProductDetailPage — interactive gallery with video embed support

