

# Vendor Storefront Page

## Goal
"Visit Vendor Store" link on product detail page → dedicated public store page showing banner, logo, store info, and grid of that vendor's active products.

## Investigation needed
Check `ProductDetailPage.tsx` for the current "Visit Store" link target, and confirm there's no existing vendor public page.

## Implementation

### New route
`/store/:vendorId` → `VendorStorePage.tsx` (public, no auth required).

### New page `src/pages/VendorStorePage.tsx`
Wrapped in `MarketplaceLayout` (navbar + footer).

**Layout (top → bottom):**
1. **Banner**: full-width 16:9 hero using `vendors.banner_url` (fallback to gradient placeholder if null).
2. **Store header card** (overlapping bottom of banner, like Facebook page style):
   - Round logo (96px, `vendors.logo_url`, fallback to first letter of store_name).
   - Store name (h1), status badge (only if approved).
   - Short description (`store_description`).
   - Action row: Follow button (uses existing `vendor_follows`), follower count, WhatsApp/phone contact buttons (gated for guests per existing rule), member-since date.
3. **Products section**:
   - Heading "Products (N)".
   - Simple sort dropdown: Newest / Price low-high / Price high-low.
   - Responsive grid of `ProductCard` (existing component) for `products` where `vendor_id = :vendorId AND status = 'active'`.
   - Empty state: "This vendor has no active products yet."

### Update product detail page
In `src/pages/ProductDetailPage.tsx`, find the "Visit Store" / vendor contact action and change target to `/store/{product.vendor_id}` (open in same tab).

### Data fetching
- One `useQuery` for vendor by id.
- One `useQuery` for products filtered by vendor_id + active.
- One light query for follower count.

### Files
- **create** `src/pages/VendorStorePage.tsx`
- **edit** `src/App.tsx` — add route
- **edit** `src/pages/ProductDetailPage.tsx` — point "Visit Store" to new route

### Notes
- Public route (RLS already allows anyone to view vendors and active products).
- Mobile-responsive: banner shrinks, logo overlaps less, grid collapses to 2 cols.
- No DB changes.

