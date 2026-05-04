# Fix: New vendors cannot upload product images

## Root cause

The `product-images` storage bucket has RLS policies that only allow inserts under two folder shapes:

1. `uploads/{auth.uid()}/...` — for personal/account uploads
2. `vendors/{vendor.id}/...` — for vendor product uploads
3. Anything, but only if the user has the `admin` role

The vendor product forms (`AddProductPage.tsx`, `EditProductPage.tsx`) currently upload to:

```
{productId}/{timestamp}-{random}.{ext}
{productId}/variant-{timestamp}-{random}.{ext}
```

This path doesn't start with `vendors/` or `uploads/`, so the storage RLS policy rejects the upload for everyone except admins. That's why admin-owned demo data works, but newly registered vendors get a "new row violates row-level security policy" error and no image is saved.

`MediaLibrary.tsx` and `VendorSettings.tsx` already use the correct `uploads/{userId}/...` shape, which is why those uploads succeed.

## Fix

Change the upload paths in the two vendor product pages to match the existing policy:

```
vendors/{vendor.id}/products/{productId}/{timestamp}-{random}.{ext}
vendors/{vendor.id}/products/{productId}/variant-{timestamp}-{random}.{ext}
```

The vendor id is already available in both pages (from `useOutletContext` / fetched product), so no new data is needed.

### Files to edit

1. **`src/pages/vendor/AddProductPage.tsx`**
   - `uploadImages(productId)` → prefix path with `vendors/${vendor.id}/products/`
   - `uploadVariantImages(files, productId)` → same prefix

2. **`src/pages/vendor/EditProductPage.tsx`**
   - `uploadImages(prodId)` → same prefix using the vendor id of the product being edited
   - `uploadVariantImages(files, prodId)` → same prefix

No database, RLS, or bucket changes are required — existing policies already permit this path. Old images stored under the previous `{productId}/...` path will continue to display because the bucket is public for `SELECT`; only new uploads change location.

## Out of scope

- No migration of existing image files (they remain accessible via the public read policy).
- No changes to the storage bucket, policies, or admin/Media Library flows.
