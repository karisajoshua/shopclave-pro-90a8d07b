# Redesign the Barakaz product detail page

## Build
- Restructure the existing product page into a dense responsive marketplace layout: breadcrumb, gallery and purchase information, delivery, seller, trust strip, content tabs, reviews, then related products.
- Upgrade the reusable gallery with overlays, previous/next controls, image count, thumbnails, keyboard labels, and mobile swipe/dots while retaining video and variant-image behavior.
- Restyle variants, quantity, pricing, inventory, desktop actions, and the mobile sticky action bar without changing purchase resolution, cart limits, checkout, or seller contact guards.
- Refactor the details/reviews area into accessible tabs using only actual product metadata and review data.

## Verification
- Extend focused tests for gallery controls, variant safety, stock-capped quantity, shared desktop/mobile purchase actions, and factual marketplace copy.
- Run the full automated test suite and TypeScript check, then inspect the page at desktop and mobile sizes.
- Check the preview build log and fix any regressions.

## Scope safeguards
- Keep CAD, existing backend queries, SEO, wishlist, cart, Buy Now, seller, review, Canadian shipping, tax, and payment behavior unchanged.
- Do not invent ratings, sales, scarcity, delivery dates, review verification, free-shipping thresholds, seller metrics, or product content.
- No payment, seller-onboarding, database, or unrelated page changes.
