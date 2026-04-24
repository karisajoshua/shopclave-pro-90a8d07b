# Fix Marketing image uploads + enforce exact dimensions

## Why uploads currently fail

The Marketing page tries to upload to the `product-images` bucket under `marketing/...`. But the storage RLS policy on that bucket only allows INSERTs under `vendors/{vendor_id}/...` for the matching vendor owner. Admins uploading marketing assets are blocked by RLS, so every upload errors out.

Additionally, the dimension validator currently tolerates ±25% drift, but you asked for the **exact** required size.

## What will change

### 1. New dedicated storage bucket: `marketing-assets`
- Public-read (banners and promo images need to render to all visitors).
- INSERT / UPDATE / DELETE limited to:
  - users with the `admin` role, OR
  - users whose team role has the `marketing.manage` permission.
- Backed by a `SECURITY DEFINER` helper `public.can_manage_marketing(uid)` so the storage policy stays simple and avoids recursive RLS.

### 2. Update `AdminMarketing.tsx` upload logic
- Switch `uploadToBucket` from `product-images` → `marketing-assets`.
- Tighten `validateFile`:
  - Reject if `img.width !== spec.w` or `img.height !== spec.h` (exact match, no tolerance).
  - Error message tells the user the detected vs required size, so they know what to re-export.
- Surface the real Supabase error message in the toast (currently a denied upload shows a generic message).
- Show the exact required dimensions more prominently in the `SpecCard` (already there, but reword: "Image must be exactly 1920 × 600 px").

### 3. Required dimensions (unchanged, just enforced strictly)
| Asset | Exact size | Max file |
|---|---|---|
| Desktop hero banner | 1920 × 600 px | 2 MB |
| Mobile hero banner | 750 × 500 px | 1 MB |
| Brand logo | 600 × 600 px | 1 MB |
| Product spotlight | 800 × 800 px | 1 MB |

Accepted formats remain JPG / PNG / WebP.

### 4. Side fixes spotted in console
- Wrap `ImageField` in `React.forwardRef` (or drop the ref forwarding entirely) to silence the "Function components cannot be given refs" warning triggered inside the Promotions dialog.
- Add a `DialogDescription` (or `aria-describedby={undefined}`) to the two marketing dialogs to clear the a11y warning.

## Files touched
- New SQL migration: create `marketing-assets` bucket + RLS policies + `can_manage_marketing` helper.
- `src/pages/admin/AdminMarketing.tsx`: bucket name, exact-size validator, better error toasts, ref/a11y cleanup.

## Out of scope
- No changes to the public homepage rendering — `HeroBanner` and `PromoStrip` already read URLs from the DB, so swapping the storage bucket is transparent to them.
- Existing banners/promotions (if any were saved) keep working since their stored URLs are absolute.
