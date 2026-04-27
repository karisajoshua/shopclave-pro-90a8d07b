
## Goal

Replace the Home & Garden subcategory tree with the user's 8-section, 3-level structure. Make the new structure flow automatically into every place categories appear (admin, vendor, search, product detail, homepage). No code changes are required for most surfaces — they already read from the `categories` table — but two surfaces need small adjustments to fully expose the third tier.

## Category structure to insert

Parent **Home & Garden** stays (id `a0000001-...0003`). Eight new (or renamed) Level‑2 children, each with Level‑3 leaves:

```text
Home & Garden
├── Kitchen & Dining (reuse existing slug kitchen-dining)
│   ├── Cookers & Ovens (parent of the next two)
│   │   ├── Gas Cookers
│   │   └── Electric Cookers / Hot Plates
│   ├── Microwaves
│   ├── Blenders & Mixers
│   ├── Kettles
│   ├── Cookware (Pots & Pans)
│   ├── Dinner Sets & Plates
│   ├── Cutlery (Spoons & Knives)
│   └── Storage Containers
├── Large Appliances
│   ├── Refrigerators & Freezers
│   ├── Washing Machines
│   ├── Dishwashers
│   └── Water Dispensers
├── Small Appliances
│   ├── Irons
│   ├── Toasters
│   ├── Coffee Makers
│   ├── Juicers
│   ├── Air Fryers
│   └── Rice Cookers
├── Furniture (reuse existing)
│   ├── Sofas & Couches
│   ├── Beds & Mattresses
│   ├── Wardrobes
│   ├── Tables & Chairs
│   ├── TV Stands
│   └── Office Furniture
├── Home Decor (reuse existing)
│   ├── Curtains
│   ├── Carpets & Rugs
│   ├── Wall Art & Frames
│   ├── Mirrors
│   ├── Lighting (Bulbs & Lamps)
│   └── Clocks
├── Cleaning & Household (rename existing "Cleaning")
│   ├── Cleaning Tools (Mops & Brooms)
│   ├── Vacuum Cleaners
│   ├── Laundry Accessories
│   └── Storage & Organizers
├── Outdoor & Garden (rename existing "Garden")
│   ├── Garden Tools
│   ├── Plants & Pots
│   ├── Outdoor Furniture
│   ├── BBQ & Grills
│   └── Watering Equipment
└── Bathroom Essentials
    ├── Shower Curtains
    ├── Towels
    ├── Bathroom Storage
    └── Soap Dispensers
```

Total new rows: 2 new Level‑2 categories, 1 renamed (`Appliances` deleted in favour of Large/Small), 2 renamed in place (`Cleaning` → `Cleaning & Household`, `Garden` → `Outdoor & Garden`), plus 47 Level‑3 leaves (and 1 Level‑3 mid‑node "Cookers & Ovens" that itself has 2 Level‑4 children — so the tree goes to 4 levels under Kitchen & Dining only).

## Handling depth

The product picker today has exactly 3 select tiers (Main → Sub → Final), so "Cookers & Ovens" being 4 levels deep would not be reachable from the vendor wizard. To keep the structure intuitive, **flatten Cookers & Ovens** into Kitchen & Dining as two leaves: `Gas Cookers` and `Electric Cookers / Hot Plates`. The grouping label "Cookers & Ovens" is preserved as a non‑selectable visual hint in the admin tree only (via name prefix) — see "Open question" below.

## Database migration

One SQL migration that:

1. Deletes the existing flat `Appliances` row under Home & Garden (no products are mapped to it; if any are, they get reassigned to `Large Appliances` first via UPDATE).
2. Renames `Cleaning` → `Cleaning & Household` (slug `cleaning-household`) and `Garden` → `Outdoor & Garden` (slug `outdoor-garden`).
3. Inserts new Level‑2 rows: `Large Appliances`, `Small Appliances`, `Bathroom Essentials`.
4. Inserts all Level‑3 leaves under their respective parents using stable slugs (kebab-case, namespaced where needed e.g. `kd-microwaves` only if a global slug collision exists; checked — none collide with existing slugs).
5. Wraps in a transaction; idempotent via `ON CONFLICT (slug) DO NOTHING`.

No schema changes — `categories` already supports arbitrary depth via `parent_id`.

## Code changes

Minimal — every consumer already reads recursively from `categories`:

- **AdminCategories.tsx** — already renders unlimited depth recursively. No change.
- **AddProductPage.tsx / EditProductPage.tsx** — already expose 3 cascading selects (Main → Sub → Final). No change. New leaves appear automatically.
- **SearchPage.tsx** — already resolves parent + children + grandchildren when a category slug is opened. No change.
- **MegaMenu.tsx** — verify it renders subcategories from DB (quick read, expected no change).
- **Index.tsx homepage grid** — shows top 6 parents only; unaffected.

If MegaMenu or any other consumer is found to hardcode subcategory lists during implementation, I'll update it to read from `categories` so vendors and admins see the new tree everywhere.

## Open question (will ask before applying)

The user's spec lists "Cookers & Ovens" as a grouping label with two cookers under it, but the product wizard supports 3 cascading levels. Two acceptable approaches:

1. **Flatten** — `Gas Cookers` and `Electric Cookers / Hot Plates` sit directly under Kitchen & Dining (recommended; keeps the wizard simple).
2. **Add a 4th-level select** — keep "Cookers & Ovens" as a real Level‑3 node with two Level‑4 leaves; expand the wizard to 4 selects.

I'll ask this with `ask_questions` at the start of implementation so the migration matches your preference.

## Deliverables

- One Supabase migration file inserting/renaming/cleaning the Home & Garden tree.
- (Conditional) wizard expansion to 4 levels if you choose option 2 above.
- No data loss: any product currently linked to `Appliances`, `Cleaning`, or `Garden` gets reassigned to the new equivalent before the row is renamed/deleted.
