# Today's Deals — sort by highest discount first

## Problem
The "Today's Deals" link in the navbar points to plain `/search`, which shows ALL active products sorted by newest. There's no deals filter and no discount-based ordering.

## Fix

### 1. Make "Today's Deals" a real deals view
Update both navbar links to `/search?deals=1` so the page knows it's in "deals mode".

- `src/components/layout/Navbar.tsx` — change the two `<Link to="/search">` for `nav.todaysDeals` to `/search?deals=1`.
- `src/components/marketplace/HeroBanner.tsx` — also point the "See all deals" CTA to `/search?deals=1` for consistency.

### 2. Filter + sort in `SearchPage`
- Read `deals` flag from search params.
- When `deals=1`:
  - Filter products to those with a real discount: `compare_at_price` is not null AND greater than `price`. (Optionally also include products with an unexpired `deal_ends_at`.)
  - Sort the result client-side by discount percentage, highest first: `(compare_at_price - price) / compare_at_price`.
  - Show a "Today's Deals" heading instead of "All Products".
- When `deals` is not set, keep the current behavior (newest first) untouched.

Implementation notes:
- Supabase doesn't sort by computed expressions easily, so do the discount sort in JS after fetching. Pull a slightly larger limit (e.g. 96) when in deals mode so the sort is meaningful.
- Use `.not('compare_at_price', 'is', null)` plus a JS guard to ensure `compare_at_price > price`.

### 3. Heading + empty state
- Heading: "Today's Deals" (with count).
- Empty state copy: "No active deals right now. Check back soon!"

## Files to change
- `src/components/layout/Navbar.tsx` (two links)
- `src/components/marketplace/HeroBanner.tsx` ("See all deals" link)
- `src/pages/SearchPage.tsx` (read `deals` param, filter + sort, heading, empty state)

No DB schema or RLS changes needed.
