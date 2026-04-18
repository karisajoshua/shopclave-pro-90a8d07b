

# Direct logo & banner upload in vendor Store Settings

## Problem
`src/pages/vendor/VendorSettings.tsx` only accepts a URL string for Logo and Banner. Vendors typically don't have an image hosted somewhere — they want to pick a file from their device.

## Fix
Replace the two URL inputs with file-upload widgets that push the file to the existing public `product-images` bucket and store the resulting public URL on `vendors.logo_url` / `vendors.banner_url`. Keep saving via the existing "Save Settings" button (URLs flow through `form` state unchanged downstream).

### Behavior per field (Logo and Banner)
- Show current image preview (if set) in the correct shape: logo = 96x96 rounded square, banner = full-width 16:9.
- Buttons: **Upload** (file picker, accepts `image/*`), **Replace** (when one exists), **Remove** (clears URL).
- On file pick:
  1. Upload to `product-images/vendor-assets/{user_id}/{logo|banner}-{timestamp}.{ext}` (existing storage policy from the `vendor_uploads` migration already permits writes under `uploads/{user_id}/`, so we'll use `uploads/{user_id}/vendor-assets/...` to stay within the allowed prefix — no migration needed).
  2. Get public URL via `supabase.storage.from("product-images").getPublicUrl(path)`.
  3. Update local `form.logo_url` / `form.banner_url` so the preview updates and the existing Save flow persists it.
- Show inline upload spinner; toast on success/failure.
- Optional: keep a small "or paste URL" collapsible for power users — **skip by default** unless requested.

### Validation
- Client-side: reject non-image MIME and files >5MB with a toast (no need for a server check).

## File changes
- **edit** `src/pages/vendor/VendorSettings.tsx`:
  - Remove the two `<Input placeholder="https://...">` fields.
  - Add a small inline `ImageUploadField` component (defined in the same file) used twice for logo and banner.
  - Wire `useAuth()` to get `user.id` for the storage path.

## Out of scope
- No DB schema changes (columns already exist).
- No new storage bucket or policy (existing `uploads/{user_id}/` policy covers it).
- Admin-side vendor editing isn't touched.

