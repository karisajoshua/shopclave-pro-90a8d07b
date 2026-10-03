# Show every corresponding colour image on product pages

## Goal
When a shopper chooses a colour, show the complete set of images saved for that colour, even when the product also has size or other variation choices.

## Changes
1. **Build one reliable colour gallery**
   - Collect images from every variant combination that shares the selected colour, rather than limiting the gallery to one size/combination.
   - Read both current variant image rows and the older per-variant image field, because the live catalogue contains products stored in both formats.
   - Sort saved images consistently and remove duplicate URLs so each distinct colour image appears once.

2. **Keep safe fallback behaviour**
   - If a selected colour has no saved colour-specific image, keep showing the product’s general images instead of a blank gallery.
   - If no general image exists, fall back to the first real saved variant image, then the Barakaz placeholder only when no uploaded image exists.
   - Do not invent or copy an image to a colour that has no corresponding uploaded image.

3. **Preserve variation and purchase rules**
   - Keep colour and size choices explicit; no multi-value variation will be silently selected.
   - Selecting colour updates the gallery immediately, while selecting the remaining options continues to determine exact price, stock, SKU, and purchase availability.
   - Preserve cart, Buy Now, stock limits, image zoom, swipe, thumbnails, and broken-image fallback behaviour.

## Verification
- Test products with colour + size combinations where images are spread across several size variants.
- Test products using current image rows and products that only have the older variant image field.
- Confirm all distinct images for the selected colour appear, duplicates do not, and changing colour replaces the gallery correctly.
- Confirm products with partial or missing colour imagery use the safe fallback and never display an empty gallery.
- Run focused variation/gallery tests and verify mobile and desktop product pages.

## Scope
Product-page image selection only. No product records, uploaded files, checkout logic, database schema, publishing, or deployment changes.
