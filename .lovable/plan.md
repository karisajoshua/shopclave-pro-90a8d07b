## Problem

After merging the new taxonomies, `categories` has ~9,000 rows spanning 5 levels. Vendor/Admin category pickers stopped working because:

1. **Row cap**: PostgREST returns max 1000 rows per request. `supabase.from("categories").select(...)` in `AddProductPage`, `EditProductPage`, `AdminCategories`, `BulkProductImport`, `AdminCommissions`, `AdminMarketing` only sees a 1000-row slice — most subcategories never appear.
2. **Depth cap**: The product wizard only renders Level 1 → 2 → 3 selectors, so the new Level 4/5 nodes are unreachable and can't be saved.

## Fix

### 1. Lazy, per-parent fetching (vendor product forms)

Replace the single "load all categories" query in `AddProductPage.tsx` and `EditProductPage.tsx` with **one query per dropdown level**, fetching only that parent's direct children:

```text
useChildren(null)            -> Level 1 (departments)
useChildren(cat1)            -> Level 2
useChildren(cat2)            -> Level 3
useChildren(cat3)            -> Level 4
useChildren(cat4)            -> Level 5
```

Each query is small (≤ a few hundred rows), cached by react-query keyed on parent id, and avoids the 1000-row cap entirely.

### 2. Variable-depth selector

Render selectors dynamically: after each pick, if that node has children, show the next level; if it has none, treat the current pick as the leaf and store it as `selectedCategoryId`. Supports any depth (currently 5, future-proof).

For **EditProductPage**, when loading an existing product, walk `parent_id` upward from `product.category_id` (one round-trip via a recursive RPC or a chained `.in()` query) to pre-populate every level.

Breadcrumb (`categoryPath`) continues to show the full chain.

### 3. AdminCategories tree

Same row-cap issue. Switch to lazy expansion: top-level query fetches `parent_id IS NULL`; expanding a node fetches its direct children on demand. Keeps the admin UI responsive with 9k+ rows.

The "Parent Category" Select inside the Add/Edit dialog becomes a small cascading picker (same component as the vendor form) instead of one giant flat list.

### 4. Other call sites

- `BulkProductImport`, `AdminCommissions`, `AdminMarketing` — audit and apply the same per-parent fetch (or a paginated `.range(0,9999)` loop) so their pickers see the full taxonomy.

## Technical notes

- New helper hook `useCategoryChildren(parentId: string | null)` in `src/hooks/` wrapping `supabase.from("categories").select("id,name,slug,parent_id").eq("parent_id", parentId)` (or `.is("parent_id", null)` when null), with `staleTime: 5 * 60 * 1000`.
- New helper `useCategoryAncestors(categoryId)` for EditProductPage — single recursive CTE via an RPC `get_category_ancestors(uuid)` returning the path root→leaf.
- No schema changes required beyond adding that one read-only RPC.
- MegaMenu already loads all rows too (line ~58 in `MegaMenu.tsx`) — same fix: switch to lazy expansion, or fetch in pages of 1000 via `.range()`. Out of scope unless you want it included.

## Out of scope

- Visual redesign of the picker
- Reorganizing taxonomy data
- MegaMenu rework (call out if you want it bundled)
