# Improve product cards and default product images

## Goal
Make product listings more persuasive using accurate marketplace data, and ensure every product page opens with a real uploaded product image before the shopper selects a color or size.

## Changes

1. **Add trustworthy shopping signals to product cards**
   - Keep the existing price, discount, and sale countdown.
   - Temporarily generate stable seeded ratings, review counts, and sold counts when a product has no real activity, so the values do not change between visits.
   - Always prefer real review and paid-order totals as soon as they exist; seeded values are fallback display data only and will not create fake review records or alter order history.
   - Show a low-stock message only when the stored inventory is genuinely low.
   - Show an estimated delivery window derived from the seller’s stored handling time.
   - Show a verified-seller indicator only when the seller is actually approved.
   - Apply the same card information consistently across the homepage, search, deals, seller stores, wishlist, and related products.

2. **Always show a default product image**
   - Preserve the rule that color and size choices are never silently selected.
   - Before a choice is made, display the first real uploaded product image by its saved position.
   - Prefer a general product image when available; otherwise use the first variant image.
   - Use the Barakaz placeholder only when the product truly has no uploaded images.
   - Keep switching the gallery to the matching variant images after the shopper chooses a color or complete variation.

3. **Reliability and consistency**
   - Add an image-error fallback on the product gallery so broken image links do not leave an empty area.
   - Keep stock, seller status, and delivery messaging tied to real stored data; seeded review and sales figures remain isolated presentation fallbacks.
   - Preserve existing cart, Buy Now, variant, stock, wishlist, checkout, and currency behavior.

## Verification
- Check products with general images, variant-only images, broken image links, and no images.
- Check that no variant is selected automatically when several choices exist.
- Confirm seeded figures are deterministic, consistent everywhere, and replaced independently by each real metric when available.
- Confirm the product review section does not invent review comments, reviewer identities, photos, or rating distributions.
- Confirm cards render correctly on mobile and desktop across all product-listing sections.
- Run focused purchase/card tests, type checks, and verify the preview build.

## Scope
Frontend and product-query presentation changes only. No publishing, deployment, payment, shipping-price, inventory-record, or database changes.
