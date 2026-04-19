

# Show "Size Chart" link on Fashion product detail pages

## Goal
Below the size variation buttons on `ProductDetailPage`, add a default dropdown/clickable link "View Size Chart" that opens a dialog containing the two uploaded size chart images (Jacket + Pants). Only show this for products in the **Fashion** category tree.

## Approach

### 1. Save the chart images as static assets
Copy the two uploads into `src/assets/`:
- `src/assets/size-chart-jacket.jpeg` (from `user-uploads://size_ch.jpeg`)
- `src/assets/size-chart-pants.jpeg` (from `user-uploads://size_hh.jpeg`)

These are the default chart shown to all Fashion products. (Per-product custom charts are out of scope — easy follow-up.)

### 2. Detect Fashion products
Fashion parent category id = `a0000001-0000-0000-0000-000000000002`. All Fashion subcategories (Men, Men's Shoes, Handbags, Jewelry, Kids, Bags & Luggage, Men's Accessories, etc.) have `parent_id` set to this id.

The product detail query currently selects `categories(name, slug)` only. Extend it to also pull `parent_id` so we can match either:
- `product.category_id === FASHION_ID`, OR
- `product.categories.parent_id === FASHION_ID`

Update select to: `categories(name, slug, parent_id)`.

### 3. UI: collapsible link + dialog
File: `src/pages/ProductDetailPage.tsx`, just after the Variant Selectors block (after line 612, before the `<Separator />` at 614).

```text
[Variant Selectors]
   Size:  [XS] [S] [M] [L] [XL]
─────────────────────────────────
📏  View Size Chart  ▾   ← always visible for Fashion products
─────────────────────────────────
```

- Render only when `isFashion === true`.
- A button styled as an inline link with a ruler icon and chevron.
- On click, open a shadcn `Dialog` titled "Size Chart".
- Dialog content: two stacked sections — **Jacket / Top** (first image) and **Pants** (second image), each shown as a responsive `<img>` with `max-w-full` and a small heading. Scrollable on mobile.
- Close via the built-in Dialog `X`.

### 4. Files to edit
- **edit** `src/pages/ProductDetailPage.tsx`
  - Extend the categories select to include `parent_id`.
  - Add `FASHION_CATEGORY_ID` constant + `isFashion` derived boolean.
  - Import the two chart images and shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`.
  - Insert the new "View Size Chart" trigger + Dialog right after the variant selectors.
- **add asset** `src/assets/size-chart-jacket.jpeg`
- **add asset** `src/assets/size-chart-pants.jpeg`

## Out of scope
- Per-vendor / per-product custom size charts (admin-uploaded). Can be added later by introducing `products.size_chart_url` and falling back to the default Fashion chart.
- Showing the link only when the product actually has a "Size" variant — by request it should show **by default** for all Fashion products.

