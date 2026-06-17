## Goal

Import the full Fashion / Shoes / Watches / Jewelry / Travel & Luggage / Bags / Fabric & Tailoring taxonomy (~5,000 leaves, 5 levels deep) from the uploaded file into `public.categories`, replacing the existing fashion-related branches and keeping non-fashion ones (Electronics, Home & Garden, Health & Beauty, Sports, Phones & Tablets, Automotive, Books).

## Approach

### 1. Parse the uploaded file
Write a small Node script (run locally, not shipped) that walks `pasted-2026-06-17T12-27-54-334Z.txt` and emits a normalized tree:

```text
Level 1  Department      e.g. "Fashion Clothing", "Shoes", "Watches", "Jewelry",
                              "Travel & Luggage", "Bags & Accessories", "Fabric & Tailoring"
Level 2  Section         e.g. "Women's Fashion Clothing", "Men's Shoes", "Kids Watches"
Level 3  Category        e.g. "Tops", "Dresses", "Sneakers", "Smart Watches"
Level 4  Subcategory     e.g. "T-Shirts", "Heels"            (group header inside a category)
Level 5  Leaf            e.g. "Plain T-Shirts", "Skinny Jeans"
```

Detection rules: emoji-prefixed UPPERCASE = Department/Section, `N- Name` or `N. Name` = Category/Subcategory, bare text lines = Leaves. The parser keeps a stack and re-parents accordingly.

### 2. Slug strategy
Per your choice, every slug is **prefixed with its parent's slug** to guarantee uniqueness, e.g. `mens-shoes-sneakers`, `womens-shoes-sneakers`, `kids-shoes-sneakers`. Top-level departments keep clean slugs (`fashion-clothing`, `shoes`, `watches`, …). Slugs are lowercased, ASCII-only, hyphenated, max 80 chars.

### 3. Replace fashion-related existing categories
In the same migration, before insert:
- Identify existing top-level slugs that overlap (`fashion`, `shoes`, `jewelry`, `bags`, `watches`, `travel`, etc. — exact list confirmed from current data first).
- For each overlapping branch, **reassign any `products.category_id` pointing to its descendants to the new closest-matching department** (best-effort: by old top-level slug → new department slug). Products under matched branches won't be orphaned.
- Delete the old branches (cascade through `parent_id`).
- Untouched departments: Electronics, Home & Garden, Health & Beauty, Sports/Fitness, Phones & Tablets, Automotive, Books.

### 4. Bulk insert
Generate a single migration containing the full INSERT statements (≈5,000 rows) for `public.categories(id, name, slug, parent_id, image_url, description)`. `image_url` left null — sidebar/category cards already fall back to `barakaz-icon.webp` / `FALLBACK_IMAGES` map. No new GRANTs needed (table already correctly granted).

### 5. Frontend adjustments
- `MegaMenu.tsx`: extend `TOP_LEVEL_ICONS` map with icons for the new departments (`shoes` → Footprints, `watches` → Watch, `jewelry` → Gem, `travel-luggage` → Luggage, `bags-accessories` → ShoppingBag, `fabric-tailoring` → Scissors, `fashion-clothing` → Shirt). Unmapped still falls back to `Tag` — no crash.
- `NewArrivalsCategories.tsx` + `Index.tsx` already query DB for top-level categories and use `FALLBACK_IMAGES` keyed by slug; no logic change required, but extend `FALLBACK_IMAGES` with placeholder entries for the new top-level slugs so they render the existing category hero images where reasonable (else fall back to barakaz icon — already handled).
- No changes to `SearchPage`, product wizard, or admin category pages — they all read `categories` generically.

### 6. Verify
After migration approval:
- `SELECT count(*) FROM categories;` → expect ≈5,000 + retained non-fashion rows.
- Spot-check `/search?category=mens-shoes-sneakers` and the sidebar mega menu render.
- Confirm `SELECT count(*) FROM products WHERE category_id NOT IN (SELECT id FROM categories);` returns 0.

## Out of scope
- No new images uploaded for the 5,000 leaves (image_url null, fallback handles display).
- No edits to product creation wizard, admin category management UI, or commission rates table (existing top-level commission rules continue to apply; new top-level departments can be configured later in the admin panel).
- No changes to RLS, grants, or unrelated tables.
