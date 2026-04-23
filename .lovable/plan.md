

# Fix: Category links should filter products

## Problem
Clicking any category in the top nav (Electronics, Fashion, Home & Garden, Health & Beauty, Sports) takes the user to `/search?category=...`, but the search page completely ignores the `category` URL parameter and shows ALL products. Same issue applies to the homepage hero category cards (Smartphones, Laptops, etc.) which all link to `/search?category=<slug>`.

## Root cause
`src/pages/SearchPage.tsx` only reads the `q` (text query) URL param. The `category` param is silently dropped.

## Fix
Update `src/pages/SearchPage.tsx` to:

1. Read the `category` slug from URL params.
2. Look up that category in the `categories` table by slug.
3. Walk the hierarchy: collect the category's id plus all descendant ids (children + grand-children). This way clicking "Electronics" returns products tagged under any electronics subcategory like Laptops, Smartphones, Audio, etc. — not just products tagged with the bare "electronics" parent.
4. Filter the products query with `.in("category_id", [...ids])`.
5. Update the page heading to show the resolved category name (e.g. "Electronics") instead of the generic "All products" when a category is active.
6. Bump the result limit from 24 to 48 so category pages feel populated.

If a slug is provided but no matching category exists, return an empty result set rather than falling back to all products.

## Files touched
```text
src/pages/SearchPage.tsx
  - Add `category` URL param handling
  - Add a lookup query that resolves slug → list of category ids (parent + descendants)
  - Apply .in("category_id", ids) filter to the product query
  - Update the H1 heading to show the category name when active
```

## Out of scope
- No changes to Navbar, MegaMenu, or HeroBanner — links are already correct.
- No DB or category record changes.
- No new filter UI (sort, price range, etc.) — only the slug-based filter.

