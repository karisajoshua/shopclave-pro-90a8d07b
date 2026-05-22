# Vendor logo + richer Seller Performance card

Two scoped UI changes inside `src/pages/ProductDetailPage.tsx` (the `SellerInfoSidebar` component). No DB or backend changes.

## 1. Show vendor logo next to store name

Currently the "Contact Seller" header shows only `vendor.store_name`. The `vendors` table already has a `logo_url` column, but it isn't being selected or rendered.

- Add `logo_url` to the vendor select in the product query (line ~248): `vendors(id, slug, store_name, logo_url, phone, phone2, website, whatsapp)`.
- In `SellerInfoSidebar`, render a 44px rounded avatar to the left of the store name:
  - If `vendor.logo_url` → `<img>` it.
  - Fallback → circle with the first letter of `store_name` on a `bg-primary/10 text-primary` background (same style used in `AdminVendors`).
- Keep the existing Follow button on the right; store name + followers count move into the middle column.

## 2. Expand "Seller Performance" card to match the reference

Replace the current 3-line list with a richer block. Since we don't yet store real seller-performance metrics, values will be **deterministic per-vendor fallbacks** (same seeded approach already used in `src/lib/product-rating-fallback.ts`), so each store always shows the same numbers. This keeps the UI honest-looking without faking volatile data.

New card layout (top to bottom):

- **Badges row**
  - ✅ "Verified Seller" — shown when `vendor.status === 'approved'` (green shield icon).
  - 👑 "Top Rated Seller" — shown when seeded customer rating ≥ 4.5 (purple crown icon).
- **Stats list** (label left, value right, each on its own row with a thin divider):
  - Response Rate — seeded 92–99 %
  - Response Time — seeded 5–30 mins
  - On-time Delivery — seeded 90–99 %
  - Order Completion — seeded 95–99 %
- **Separator**
- **Ratings rows** (star icon + value out of 5):
  - Quality Score — seeded 4.3–4.9
  - Customer Rating — seeded 4.3–4.9
- **Footer**: `(Based on N ratings)` — seeded 200–2,000.

All colors via existing semantic tokens (`text-success`, `text-warning`, `text-muted-foreground`, etc.). New seeded helper `getDisplayVendorPerformance(vendorId)` added to `src/lib/product-rating-fallback.ts` (or a new sibling file) so the values are stable across renders.

## Notes

- Mobile and desktop both render `SellerInfoSidebar`, so one change covers both layouts.
- No new dependencies; icons (`ShieldCheck`, `Crown`, `Star`) are already in `lucide-react`.
- If you later want **real** metrics (actual response times, on-time delivery, etc.), that's a separate piece of work — would need new tables/aggregations on orders + chat messages. Say the word and I'll plan that.
