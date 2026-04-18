

# Vendor name in URL instead of UUID

## Current state
- Route is `/store/:vendorId` and links use `/store/${vendor.id}` (UUID).
- `vendors` table has no `slug` column.
- The user mentions `/search?vendor=<uuid>` which doesn't match any existing code — likely confusion with the address bar showing the storefront URL after a redirect, or an older link. Either way, the goal is clear: vendor links should show the store name, not a UUID.

## Fix: add a `slug` to vendors and route on it

### 1. DB migration
- Add `slug text unique` to `public.vendors`.
- Backfill existing vendors: `slug = slugify(store_name)` with collision suffix `-2`, `-3`, etc.
- Add a trigger (BEFORE INSERT/UPDATE on `store_name`) that auto-generates/updates `slug` when it's null or when `store_name` changes and the vendor opts in. To keep it simple and predictable: only auto-fill on INSERT and when `slug IS NULL`. Vendors can edit their slug later from Store Settings.
- Add `CREATE INDEX vendors_slug_idx ON vendors(slug)`.

### 2. Route change
- Update route in `src/App.tsx`: `/store/:slug` (replaces `:vendorId`).
- Keep backward compatibility: in `VendorStorePage`, if param looks like a UUID, fetch by `id`; otherwise fetch by `slug`. This way old links and shared UUID URLs still work.

### 3. Update all links to use slug
Files that link to a store:
- `src/pages/ProductDetailPage.tsx` line 190 → `/store/${vendor.slug ?? vendor.id}`.
- Any other `/store/${...id}` occurrences (search confirmed only that one + the route + the page itself).

### 4. Vendor Store Settings
- Add a "Store URL" field in `src/pages/vendor/VendorSettings.tsx` showing `barakaz.com/store/<slug>` with an editable slug input (lowercase, hyphenated, validated unique on save). Optional polish — include in this task.

### 5. URL preview
Result: `https://barakaz.com/store/acme-electronics` instead of `/store/7622f8b9-...`.

## Files
- **migration**: add `slug` column + backfill + unique index + insert trigger
- **edit** `src/App.tsx` — route param rename
- **edit** `src/pages/VendorStorePage.tsx` — fetch by slug or UUID
- **edit** `src/pages/ProductDetailPage.tsx` — link uses `vendor.slug`
- **edit** `src/pages/vendor/VendorSettings.tsx` — editable Store URL field

## Out of scope
- Search-results filtering by vendor (no current `/search?vendor=` code path exists).
- Renaming the route itself away from `/store/`.

