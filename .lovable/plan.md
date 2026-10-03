# Show the correct product image for every colour choice

## Goal
Every colour option on a product page will display the actual matching product thumbnail beside its colour name, and selecting it will open all images saved for that colour.

## Changes
1. **Match each colour to its real image**
   - Resolve colour images across every size or other combination sharing that colour.
   - Support both current image records and the older saved variant-image field, since live products use both formats.
   - Show the first matching product image as the colour thumbnail beside the colour name.

2. **Show the complete selected-colour gallery**
   - When a shopper selects a colour, collect all distinct images attached to that colour across its variant combinations.
   - Sort them consistently, remove duplicate URLs, and update the main image and thumbnail strip immediately.
   - Include shared product photos after the colour-specific photos so a colour with only one attached image does not reduce the whole gallery to one photo.

3. **Use safe fallbacks without mismatching colours**
   - If a colour has no dedicated uploaded image, use a shared product photo as its thumbnail rather than leaving a text-only option.
   - If no shared photo exists, use the first real uploaded variant image; use the Barakaz placeholder only when the product has no uploaded images at all.
   - Do not invent, recolour, or assign an unrelated image as though it were specific to a colour.

4. **Preserve variation and purchase safeguards**
   - Keep colour and size choices explicit; no multi-value variation will be selected automatically.
   - Price, stock, SKU, availability, cart, and Buy Now continue to use the fully selected variant.
   - Preserve image zoom, swipe, thumbnails, and broken-image fallback behaviour.

## Verification
- Check colour buttons on products with colour-only and colour-plus-size variations.
- Confirm every colour button contains a product thumbnail and its colour name.
- Confirm selecting each colour shows all distinct matching images and no duplicates.
- Check products whose images use current records, the older variant field, shared photos only, partial colour imagery, and no uploaded imagery.
- Verify mobile and desktop layouts, focused tests, and the preview build.

## Scope
Product-page colour thumbnails and gallery image selection only. No product records, uploaded files, checkout logic, database schema, publishing, or deployment changes.
