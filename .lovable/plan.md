# New Arrivals — Categories Row

Add a horizontal categories section titled **New Arrivals** placed directly above the Sponsored Products section on the homepage. Clicking any category navigates to the search page filtered by that category and sorted newest-first.

## What to build

**New component:** `src/components/marketplace/NewArrivalsCategories.tsx`
- Fetches top-level categories (same query already used in `Index.tsx`: `categories` where `parent_id is null`, limit 12).
- Reuses the existing image source pattern: `category.image_url || barakazIcon` (same fallback used in Index/CategoryCard).
- Renders a heading "New Arrivals" with a horizontally scrollable / responsive grid of circular category tiles (visual style matches existing `CategoryCard` — 64–80px circular images, name underneath).
- Each tile is a `<Link>` to `/search?category={slug}&sort=newest` so SearchPage shows products for that category ordered by newest first (SearchPage already supports both `category` and a `newest` sort key).
- Hidden gracefully if no categories exist.

**Edit:** `src/pages/Index.tsx`
- Import and render `<NewArrivalsCategories />` immediately above `<PromoStrip />` (which contains the Sponsored Products section).

**Edit:** `src/pages/SearchPage.tsx` (small)
- Read the `sort` URL search param on mount so `?sort=newest` from the New Arrivals links auto-applies the "Newest" sort. (Currently the page reads `category` and search query but not `sort` — a one-line useEffect/initial state addition.)

## Layout

```text
┌─ New Arrivals ─────────────────────────────────┐
│  ◯ Electronics  ◯ Fashion  ◯ Home  ◯ Beauty …  │
└────────────────────────────────────────────────┘
┌─ Sponsored Products ──────────────────────────┐
│  [tile][tile][tile][tile]                      │
└────────────────────────────────────────────────┘
```

Grid: `grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3` so it stays compact on the 881px viewport. Falls back to the Barakaz icon placeholder for any category without an `image_url`, exactly like the existing categories grid.

## Out of scope
- No DB changes. Uses existing `categories.image_url` field and existing search route.
- No new "newest products" listing component — SearchPage already handles that.
