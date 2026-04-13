

# Jumia-Style Boxed Sections for Product Detail

## What changes
Replace the current tabbed `ProductDescriptionTabs` component with stacked, individually boxed sections — matching the Jumia layout from the reference screenshots.

## Layout (top to bottom)

### Box 1: Product Details
- Bordered card with "Product details" as the header (bold, with a bottom separator)
- Renders the product description text with `whitespace-pre-line` to preserve formatting and bullet points

### Box 2: Specifications
- Bordered card with "Specifications" header
- Two-column grid inside:
  - **KEY FEATURES** card (left) — bullet list extracted from description or placeholder
  - **WHAT'S IN THE BOX** card (right) — placeholder for now (e.g., "1 x Product Name")
- Below the grid: key-value rows for SKU, brand/model if available

### Box 3: Reviews
- Bordered card with "Customer Reviews" header
- Embeds the existing `ProductReviews` component

### Box 4: Shipping & Returns
- Bordered card with the existing delivery/returns/buyer protection info (icons + text)

## Files to modify
- `src/components/product/ProductDescriptionTabs.tsx` — full rewrite: replace `Tabs` with stacked `div` sections, each in its own bordered card. Add the two-column KEY FEATURES / WHAT'S IN THE BOX grid in the Specifications section.
- No changes needed to `ProductDetailPage.tsx` — the component interface stays the same (`description`, `productId` props).

## Styling
- Each section: `border border-border rounded-lg bg-card` with internal padding
- Section headers: bold text with a bottom `Separator`
- KEY FEATURES / WHAT'S IN THE BOX: side-by-side cards in a `grid grid-cols-1 md:grid-cols-2 gap-4` layout, each with its own border and uppercase header
- Spacing between sections: `space-y-6`

