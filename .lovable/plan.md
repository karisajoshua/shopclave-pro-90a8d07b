

# Enable vendor image uploads from local device

## What's wrong now
The current Media Library (`src/components/media/MediaLibrary.tsx`) **does** support uploading from the local computer via the "Upload to product" dialog — but it requires picking an existing product first. If a vendor hasn't created any products yet, the product picker is empty and they can't upload anything. There's no way to upload a "loose" image without attaching it to a product.

Also, the current short-link copy flow only works on images that are already in `product_images`, so vendors with zero products see nothing to act on.

## Fix
Add a **standalone vendor uploads** path so any vendor (or admin) can upload images straight from their device into the `product-images` bucket without needing a product first, then edit / delete / copy short link on those uploads. Product-image management stays as is.

### Steps

1. **New table `vendor_uploads`** to track standalone uploads:
   ```
   id uuid pk
   user_id uuid (auth.users)
   vendor_id uuid nullable (vendors)
   url text
   storage_path text
   file_name text
   created_at timestamptz
   ```
   RLS:
   - INSERT: authenticated, `auth.uid() = user_id`
   - SELECT/UPDATE/DELETE: owner OR admin

2. **Storage**: reuse existing public `product-images` bucket under prefix `uploads/{user_id}/...`. No new bucket needed.

3. **Refactor `MediaLibrary.tsx`** into a tabbed view:
   - **Tab 1 — "My Uploads"** (default for vendors): grid of `vendor_uploads` rows. Big "Upload images" button at top opens a file picker (multi-select, drag-and-drop too). No product selection required. Each card shows actions: Copy short link, Replace, Delete, and "Attach to product" (opens product picker → inserts row in `product_images`).
   - **Tab 2 — "Product Images"**: existing behavior (lists `product_images` joined to products, with edit/delete/replace/copy-link).
   - Admin sees both tabs with a vendor filter on each.

4. **Upload flow** (no product needed):
   - File → upload to `product-images/uploads/{user_id}/{timestamp}-{rand}.{ext}`
   - Get public URL
   - Insert row into `vendor_uploads`
   - Toast success, refresh grid

5. **Empty state**: if a vendor has no products AND no uploads, show a friendly message on the page pointing them to the "Upload images" button so they understand they can start uploading immediately.

## File changes
- **migration**: create `vendor_uploads` table + RLS
- **edit** `src/components/media/MediaLibrary.tsx`: add Tabs, "My Uploads" tab with standalone uploader, "Attach to product" action, drag-and-drop zone
- **edit** `src/integrations/supabase/types.ts`: auto-regenerated after migration

## Out of scope
Short-link table, sidebar entries, routes, and footer — already in place from the previous task. Favicon caching is unrelated.

