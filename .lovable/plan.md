## Goal
Add a new top-level **Kids Fashion** branch under the **Fashion Clothing** department, and move all kid-related subcategories currently mis-parented under **Men's Fashion Clothing** into it.

## What gets moved

Under `Fashion Clothing > Men's Fashion Clothing` these four branches are clearly kids and will be re-parented under the new **Kids Fashion**:

| Current name | Notes |
|---|---|
| Baby Fashion (0–24 Months) | + all descendants |
| Toddler Fashion (2–5 Years) | + all descendants |
| Boys Fashion (6–16 Years) | + all descendants |
| Girls Fashion (6–16 Years) | + all descendants |

No kid-only top-level branch exists under **Women's Fashion Clothing** — all current Women's subcategories are women's (Dresses, Tops, Lingerie, Maternity, etc.). Nothing to move from Women's.

`Costumes & Dress-Up` under Men's contains both adult and kids items, so it stays where it is unless you say otherwise.

## Changes

1. **Database migration**
   - Insert a new category `Kids Fashion` with slug `fashion-clothing-kids-fashion`, parent = `Fashion Clothing` (root `9f16553f-…`).
   - `UPDATE categories SET parent_id = <new Kids Fashion id>` for the 4 branch IDs above. Their descendants follow automatically because the hierarchy is parent-based.
   - Optional slug rewrite: leave child slugs alone (slugs are arbitrary identifiers; the path is computed from `parent_id`). Skipping a mass slug rename keeps existing product URLs / saved category IDs stable.

2. **Frontend**
   - No code changes required. The taxonomy is rendered dynamically by `CategoryPicker`, `MegaMenu`, homepage category grids, and admin tree — all driven by `parent_id`, so they pick up the new structure automatically.
   - Existing products' `category_id` values remain valid (we only moved branches, not deleted nodes).

## Out of scope
- Renaming slugs of the moved branches.
- Adding a category image for **Kids Fashion** (can be uploaded later from Admin → Categories).
- Touching Women's Fashion subcategories (no kid items found there).