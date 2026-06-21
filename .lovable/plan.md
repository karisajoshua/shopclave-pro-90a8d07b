## Problem

The sidebar's "Shop by Category" section is empty because `SidebarMenu` (in `src/components/layout/MegaMenu.tsx`) tries to fetch the entire taxonomy (~19,540 rows, ~20 paginated requests) before rendering anything. The grid renders only after every page completes — until then the section appears blank, and on slow connections it can fail/stall.

## Fix

Switch the sidebar to **lazy loading**, mirroring the pattern already used by `CategoryPicker`:

1. On open, fetch only top-level categories (`parent_id IS NULL`, ~14 rows) → render immediately.
2. When the user expands a top-level item, fetch its direct children on demand.
3. When the user expands a sub-category, fetch that node's children on demand.
4. Cache each level via React Query (`["sidebar-children", parentId]`, 5-min staleTime).

Leaf detection: PostgREST can't tell us "has children" cheaply per row. Render every sub-item as expandable; if the children fetch returns zero rows, auto-treat it as a leaf link to `/search?category=<slug>`.

## Files to change

- `src/components/layout/MegaMenu.tsx` — replace the single all-rows query + `buildTree` with three level components (`TopLevelList`, `SubList`, `LeafList`), each using its own `useQuery` keyed by `parentId`. Keep existing icons map, sheet layout, account links, and styling unchanged.

No DB, RLS, or other component changes needed — `categories` grants are already correct (top-level requests are returning 200s).
