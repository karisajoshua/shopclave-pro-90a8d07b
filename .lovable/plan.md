## Problem

The `categories` table has no Data API permissions. PostgREST blocks all reads, so:

- Homepage category grid is empty
- Vendor "Add Product" CategoryPicker shows no options
- Admin Categories page is empty
- Mega menu has no categories

The previous grant migration did not actually apply — I just re-checked and `information_schema.role_table_grants` still returns zero rows for `public.categories`. RLS is already correct (`USING (true)` for SELECT), but without GRANTs PostgREST returns permission errors.

## Fix

Run a single migration that grants Data API access on `public.categories`:

```sql
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
```

This restores:
- Public read for guests and signed-in users (homepage grid, mega menu, search)
- Admin writes via existing RLS policy `Admins can manage categories`
- Edge-function/service-role access

No code changes required — the React queries are correct; they just can't reach the table.

## Verification after apply

1. Reload the homepage — the category grid renders all 14 top-level categories.
2. Open vendor dashboard → Add Product → Step 1 — the CategoryPicker dropdown lists main categories and cascades into subcategories.
3. Open admin Categories — the tree loads.