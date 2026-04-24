# Hero carousel: multiple images + clearer promo placement

## What's actually happening today

- **Hero banners** already supports multiple slides — every row in `hero_banners` is one slide, and the homepage carousel rotates through all active rows. But the admin form only lets you create slides **one at a time** (one desktop + one mobile per save), which feels like "only one image".
- **Promotions** already has a "Placement" dropdown (Featured Brands / Sponsored Products), but it sits next to "Type" with no explanation, and the list view doesn't group items by where they will appear, so it's not obvious where each promo will show up.

## What will change

### 1. Hero Banners tab — bulk slide upload
Add a second action **"Bulk add slides"** next to "Add banner". It opens a streamlined dialog where the admin can:

- Drop / select **multiple desktop images at once** (each becomes one carousel slide, in the order picked).
- Optionally drop / select **multiple mobile images** — paired with desktops by order (1st mobile → 1st desktop, etc.). Any desktop without a paired mobile just falls back to the desktop image on phones, which is what the homepage already does.
- Each file is validated against the exact size rules (1920×600 desktop, 750×500 mobile) and shows a per-file ✓ / ✗ status before saving.
- Hitting "Create N slides" uploads all valid pairs to the `marketing-assets` bucket and inserts one `hero_banners` row per slide, with `display_order` continuing from the current max so they append to the existing carousel.
- All new slides default to `is_active = true` and link to `/`. The admin can fine-tune title / link / CTA per slide afterwards using the existing edit pencil.

The single-slide "Add banner" dialog stays for fine-grained edits and CTAs.

### 2. Promotions tab — clearer placement
- Rename the "Placement" select to **"Display section"** with a short helper line under it: *"Where this promo appears on the homepage."*
- Each option label gets a description:
  - **Featured Brands** — small logo grid below the hero (uses Brand 600×600 image).
  - **Sponsored Products** — large product cards under Featured Brands (uses Product 800×800 image).
- When the admin picks a section, the **Type** auto-syncs (Featured Brands → Brand, Sponsored Products → Product) so the right image spec is shown. Type stays editable for power users but is no longer a separate decision in 90% of cases.
- The promotions list view is **grouped by section** with a section header ("Featured Brands — 4 live", "Sponsored Products — 2 live") so it's obvious at a glance what shows where.
- The card badge changes from "Brands" / "Sponsored" to the full section name.

### 3. Carousel rendering (no change needed)
The homepage `HeroBanner.tsx` already loops through every active `hero_banners` row, auto-rotates every 5s, and renders dots + prev/next arrows when there's more than one slide. Once the bulk-upload flow lands, all newly added slides show up in the carousel automatically.

## Files touched
- `src/pages/admin/AdminMarketing.tsx` — add `BulkBannersDialog`, rewire "Display section" UI, group promotions list by placement.

## Out of scope
- No DB migration needed — `hero_banners` and `promotions` schemas already support everything.
- No change to the public homepage — carousel and PromoStrip already render whatever is in the DB.
- Drag-and-drop reordering across both lists stays as-is (up/down arrows).
