# Vendor Store: Category Nav + Vendor-Featured Products

Two related additions to the public vendor store page (`/store/:slug`), plus a vendor dashboard control to mark products as "featured on my store".

## 1. Category navigation bar on the store page

On `VendorStorePage.tsx`, just above the products grid, render a horizontal scrollable bar of the categories that the vendor actually has active products in.

Behavior:
- Derived from the vendor's loaded products (no extra query needed — we already join `category_id` if we add it to the select).
- First chip: "All" (default selected, shows all products).
- Each other chip: a category the vendor sells in, with a count badge (e.g. "Phones · 12").
- Clicking a chip filters the grid client-side (instant, no reload).
- Sticky-ish styling on mobile, horizontally scrollable, matches Amazon-style sub-nav using the marketplace orange accent for the active chip.
- Hidden when the vendor has products in fewer than 2 categories (no point showing nav).

Implementation:
- Extend the `vendor-store-products` query to also select `category_id, categories(id, name, slug)`.
- Build a unique `[{id, name, count}]` list with `useMemo`.
- Add `selectedCategoryId` state; filter `sortedProducts` by it.

## 2. Vendor-featured products (store page only)

Add a separate "Featured" capability that is independent of the existing admin-only homepage `featured` flag.

### Database
Add a new boolean column on `products`:
- `vendor_featured boolean not null default false`

The existing `featured` column stays exclusively for admins (homepage). The new `vendor_featured` is what vendors control — it only affects their own store page.

RLS already lets vendors update their own products via the existing "Vendors can manage own products" policy, so no policy changes needed.

### Vendor dashboard (`VendorProducts.tsx`)
- Add a Star toggle button per product row (desktop table + mobile card), mirroring the admin pattern but bound to `vendor_featured`.
- Show a small "Featured on store" badge when `vendor_featured = true`.
- Tooltip clarifies: "Featured on your store page".

### Store page (`VendorStorePage.tsx`)
- Update the products query to also select `vendor_featured`.
- If at least one product has `vendor_featured = true`, render a **"Featured by {store_name}"** section above the category nav, showing those products in the same `ProductCard` grid (max ~8, sorted newest first).
- The featured products still appear in the main grid below as well (no exclusion), so customers see them in normal browsing too.
- The featured section respects the active category filter is **not** applied (always shows the vendor's chosen highlights regardless of filter), since it's a curated band.

## Files to change

- **Migration**: add `vendor_featured` column to `products`.
- `src/pages/VendorStorePage.tsx` — extend query, add Featured section, add CategoryNav, wire filter state.
- `src/pages/vendor/VendorProducts.tsx` — add vendor-featured toggle + badge in both desktop and mobile views.

## Out of scope
- No change to admin homepage feature logic.
- No limit/cap on how many products a vendor can feature (can add later if needed).
