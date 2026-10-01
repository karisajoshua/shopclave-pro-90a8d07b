# Review step: match the Add flow's summary in Edit product

The Add Product wizard's last step already shows the full review (sectioned summary cards with Edit buttons). The Edit Product wizard's last step still shows an old, thin list: no brand/MPN, barcode, package dimensions, shipping options, media thumbnails or video, and no variants table. The Edit flow will get the same review layout as Add.

## What changes

Rebuild **step 6 (Review & Save)** of `src/pages/vendor/EditProductPage.tsx` to show the same cards as the Add flow, using the product's current values:

1. **Product Details** — name, category path, brand, model/MPN, condition, key features count, what's-in-the-box count — with an **Edit** button that jumps back to the Details step.
2. **Pricing & Inventory** — price, compare-at price, SKU, barcode, stock (variant total when variants are on, otherwise the product stock), min/max order quantity — Edit jumps to Pricing.
3. **Shipping** — package weight and dimensions, plus each enabled shipping option with its delivery time and price (Standard / Express / Free Shipping / Local Pickup) — Edit jumps to Pricing.
4. **Media** — thumbnail strip of the product images (first 6) and the video link when set — Edit jumps to Media.
5. **Variants** (only when variants are enabled) — table of every combination with its price, stock, SKU and first image — Edit jumps to Variants.
6. **Seller** — store name (no Edit; seller info is managed in store settings).

Keep the existing **Back / Save as Draft / Publish Product** buttons exactly as they are. No save logic, validation, or data handling changes — this is the review display only.

## Technical details

- Only the `step === 5` block of `src/pages/vendor/EditProductPage.tsx` is replaced; all state, `handleSubmit`, and step validators stay untouched.
- The card markup mirrors the Add page's review step (bordered sections, header row with Edit, `dl` rows, image strip, variants table).
- Add page needs no changes — its review already matches the designs.
- Verify with typecheck, the test suite, and a Playwright pass through the Edit flow in the preview to confirm every section renders with real saved data.

Nothing is published or deployed.
