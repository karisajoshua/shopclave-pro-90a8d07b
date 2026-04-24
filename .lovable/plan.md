## Make banner clicks land on real destinations

### Problem
Today the banner "Link URL" is a free-text field. Admins have to know the exact path (e.g. `/search?category=fashion` or `/product/some-slug`) and typos silently break the click-through. You want a guided way to map each banner to a real destination — a category, a specific product, a vendor store, or a custom URL.

### What changes (Hero Banners + Promotions)

Replace the single "Link URL" text input with a **"When clicked, go to…"** picker that has 4 modes:

1. **Category** — dropdown of all categories from the `categories` table (loaded live). Saves as `/search?category={slug}`.
2. **Specific product** — searchable combobox that queries `products` (active only) by name. Picking one saves `/product/{slug}`.
3. **Vendor store** — searchable combobox over `vendors` (approved only). Saves `/store/{slug}`.
4. **Custom URL** — the existing free-text input, for edge cases (external links, static pages like `/vendor/register`, etc.).

The mode selector is a small segmented control above the destination field. When the admin picks "Category", the dropdown appears; when they pick "Specific product", the searchable picker appears; etc. The resolved URL is shown read-only underneath as a preview ("Will link to: /search?category=fashion") so the admin always sees where the click goes.

On **edit**, the existing `link_url` is parsed back into the right mode automatically:
- starts with `/search?category=` → Category mode, with that slug pre-selected
- starts with `/product/` → Product mode, with that product pre-selected
- starts with `/store/` → Vendor mode
- anything else → Custom URL mode

### Where this applies
- **Hero Banners dialog** (single add + edit) — replaces the current "Link URL *" field.
- **Bulk add slides dialog** — adds an optional "Default destination" picker at the top so all newly-uploaded slides share one link (e.g. all 5 fashion banners → `/search?category=fashion`). Admin can still fine-tune each slide afterwards via the edit pencil.
- **Promotions dialog** — same picker replaces the current Link URL field, so a Featured Brand promo can map directly to that vendor's store and a Sponsored Product promo can map to the product page.

### UX details
- Product / vendor pickers use `Command` (shadcn combobox) with a 300ms debounced search, capped at 20 results.
- Category dropdown shows the parent category in parentheses for child categories so duplicates like "Smartphones" are distinguishable.
- The preview line under the picker is clickable in a new tab so admin can sanity-check the destination before saving.
- If a previously-linked product or vendor gets deleted, the edit form falls back to "Custom URL" mode and shows a small warning: *"Original product no longer exists — pick a new destination or update the URL."*

### Files touched
- `src/pages/admin/AdminMarketing.tsx` — add a shared `<DestinationPicker>` component, wire it into the banner dialog, bulk dialog, and promotion dialog, and handle parse-on-edit.

### Out of scope
- No DB changes. `hero_banners.link_url` and `promotions.link_url` already store the resolved path — we're just upgrading how it's chosen.
- No change to the public homepage rendering — `HeroBanner.tsx` already uses `link_url` as-is.
- No change to existing banners' stored URLs unless the admin re-saves them.