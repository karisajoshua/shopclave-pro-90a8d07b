## Goal
Import the uploaded Sports & Fitness taxonomy (~5,925 lines, 5 levels deep) into `public.categories`, merging it under the existing `Sports & Fitness` department (slug `sports`, id `a0000001-…-0005`). Keep existing rows untouched; only add what's missing.

## Approach

### 1. Parse the file
A Python script walks `pasted-2026-06-19T11-55-39-156Z.txt` and emits a normalized tree:

```text
Level 1 = "Sports & Fitness"          (already exists — root, not inserted)
Level 2 = Department section          e.g. "Combat Sports", "Team Sports"   (1- 🥊 UPPERCASE)
Level 3 = Category                    e.g. "Boxing", "Martial Arts"         (N. 🥊 Title)
Level 4 = Subcategory                 e.g. "Boxing Gloves"                   (N- Title)
Level 5 = Leaf                        e.g. "Training Boxing Gloves"          (bare text)
```

Stack-based reparenting detects level from prefix pattern (`N- 🥊 UPPERCASE`, `N. Title`, `N- Title`, bare text).

### 2. Slug strategy (parent-prefixed)
Same scheme as the previous import: each slug = `<parent-slug>-<slugified-name>`, lowercased, hyphenated, max 80 chars. Root department keeps `sports`. Example: `sports-combat-sports`, `sports-combat-sports-boxing`, `sports-combat-sports-boxing-boxing-gloves`, `sports-combat-sports-boxing-boxing-gloves-training-boxing-gloves`.

### 3. Merge logic (no destruction)
For each parsed node, top-down:
- Look up an existing child of the current parent by **case-insensitive name match** OR exact slug match.
- If found → reuse its id, recurse into its children. Do NOT update the row.
- If not found → `INSERT` a new row (`id = gen_random_uuid()`, `parent_id`, `name`, `slug`, `image_url = null`, `description = null`).

This preserves existing Sports children (`Combat Sports`, `Cycling`, `Fitness & Gym Equipment`, …) and the products linked to them. New branches (e.g. uploaded subtrees not yet in DB) are added; overlapping branches receive only the missing leaves.

Slug uniqueness collisions (rare, only if a different branch already owns the prefixed slug) are resolved by appending `-2`, `-3`, … to the new row only.

### 4. Execution
- Run the parser locally to emit a deterministic ordered SQL file (`sports_merge.sql`) of pure `INSERT … WHERE NOT EXISTS …` statements, level-by-level, so foreign keys resolve.
- Execute via `psql` against the project DB (existing exec access, insert-only — fits the constraint, no schema changes).
- No migration file is needed because schema is unchanged; only data is added.

### 5. Frontend
No changes required:
- `MegaMenu.tsx` already maps `sports` to a Dumbbell icon; new descendants render generically.
- `NewArrivalsCategories.tsx` `FALLBACK_IMAGES` already covers `sports`.
- `SearchPage`, product wizard, admin category UI all read the table generically.

### 6. Verify
- `SELECT count(*) FROM categories WHERE slug LIKE 'sports-%' OR id = '…-0005';` → expect old + new rows.
- Spot-check via admin Categories page that `Sports & Fitness → Combat Sports → Boxing → Boxing Gloves → Training Boxing Gloves` exists exactly once.
- `SELECT count(*) FROM products WHERE category_id NOT IN (SELECT id FROM categories);` → 0.

## Technical details
- Parser language: Python 3 (already in sandbox), regex-driven, ~120 lines.
- Insert volume: roughly 1,500–3,000 new rows (depends on overlap with existing 11 Sports children).
- Idempotent: re-running the script inserts nothing new because of name+parent uniqueness checks.

## Out of scope
- No image uploads for new categories (image_url null → existing fallback handles display).
- No commission-rate rows for the new top-level (Sports already has its rate).
- No edits to product wizard, admin UI, or unrelated tables.
