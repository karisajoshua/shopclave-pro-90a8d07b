

# Social links + Media Library + Live analytics

## 1. Footer social links (real URLs)

In `src/components/layout/Footer.tsx`, wire actual `href` values onto the existing icons. Other icons stay (Twitter/X, YouTube, LinkedIn, WhatsApp) with `#` placeholders preserved so the row layout is unchanged.

| Icon | URL |
|---|---|
| Facebook | `https://www.facebook.com/share/1E58qDYbDL/?mibextid=wwXIfr` |
| Instagram | `https://www.instagram.com/barakazofficial` |
| TikTok (the inline SVG already in the footer) | `https://www.tiktok.com/@barakazofficial` |
| Snapchat / X / YouTube / LinkedIn / WhatsApp | unchanged |

## 2. Media Library (Admin + Vendor) — product-images scope

A new page that lists images from the existing `product_images` table joined to `products`, with edit / delete / copy-short-link actions.

### Routes & sidebar
- Add route `/admin/media` → `AdminMedia.tsx` and sidebar entry "Media" (Images icon) in `AdminSidebar`.
- Add route `/vendor/media` → `VendorMedia.tsx` and sidebar entry "Media" in `VendorSidebar`.

### Page UI (shared shape)
- Grid of image cards (thumbnail, product name, position).
- Per card actions:
  - **Upload replacement** (file picker → uploads to `product-images` bucket → updates `product_images.url`).
  - **Edit** (opens dialog: change `position`, reassign `product_id` from a searchable list of the user's products).
  - **Delete** (removes storage object + DB row, with confirm).
  - **Copy short link** (creates/fetches a row in `short_links`, copies `https://barakaz.com/s/<code>` to clipboard).
- Top filter: search by product name; admins also get a vendor filter.
- "Upload to product" button at top: pick product → upload one or many files in parallel → insert `product_images` rows.

### Scoping
- **Admin** sees all images (RLS already allows via existing admin policies on products/product_images).
- **Vendor** only sees images for products belonging to their vendor (existing RLS already enforces this).

## 3. Built-in short links

### New table `short_links`
```
id uuid pk
code text unique  (8-char nanoid-style, generated client-side or via gen_random_uuid()::text substring)
target_url text not null
created_by uuid references auth.users
click_count int default 0
created_at timestamptz default now()
```

### RLS
- `INSERT`: any authenticated user (so vendors and admins can shorten links to their own images).
- `SELECT`: public (needed so the redirect route can read by code anonymously).
- `UPDATE/DELETE`: owner OR admin.

### Redirect route
- Add `<Route path="/s/:code" element={<ShortLinkRedirect />} />` in `App.tsx`.
- `ShortLinkRedirect.tsx` queries `short_links` by code, increments `click_count` (insert-only RLS would block update — instead use a SECURITY DEFINER RPC `increment_short_link_click(code text)`), then `window.location.replace(target_url)`.

### Copy flow
On "Copy short link" for an image:
1. Look up existing `short_links` row where `target_url = image.url AND created_by = auth.uid()`.
2. If none, insert one with a freshly generated 8-char code.
3. Copy `${window.location.origin}/s/${code}` to clipboard, toast success.

## 4. Site Analytics — refresh every 10s

In `src/components/admin/SiteAnalytics.tsx`, change `refetchInterval: 30000` → `10000` and keep the manual refresh button.

## File changes
- **edit** `src/components/layout/Footer.tsx` — add real URLs to Facebook, Instagram, TikTok icons.
- **edit** `src/components/admin/SiteAnalytics.tsx` — refetchInterval 10s.
- **edit** `src/components/admin/AdminSidebar.tsx` — add Media entry.
- **edit** `src/components/vendor/VendorSidebar.tsx` — add Media entry.
- **edit** `src/App.tsx` — register `/admin/media`, `/vendor/media`, `/s/:code` routes.
- **create** `src/pages/admin/AdminMedia.tsx`
- **create** `src/pages/vendor/VendorMedia.tsx`
- **create** `src/components/media/MediaLibrary.tsx` — shared component (mode prop: "admin" | "vendor", vendorId).
- **create** `src/pages/ShortLinkRedirect.tsx`
- **create** `src/lib/shortLinks.ts` — helper `getOrCreateShortLink(targetUrl)`.
- **migration** create `short_links` table + RLS + `increment_short_link_click` RPC.

## Notes
- Uses existing `product-images` storage bucket (already public).
- No Edge Function needed; everything runs client-side against Supabase.
- Search engine favicon caching from the previous task is unrelated and unaffected.

