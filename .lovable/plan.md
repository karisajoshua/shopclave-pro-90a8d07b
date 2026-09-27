# Clean up the checkout review page

## What will change
- Rebuild the review step as one calm, clearly ordered summary: delivery address, parcels and products, then totals.
- Show product thumbnails, quantities, variants, seller, delivery choice, and arrival estimate with consistent alignment and spacing.
- Remove duplicated visual borders and competing summary blocks while keeping the existing checkout steps and payment behavior unchanged.
- Make edit actions easy to find and ensure long product names, addresses, and prices remain readable on phones.
- Keep taxes explicitly marked as not yet calculated and keep the total labeled “Total before applicable taxes.”

## Verification
- Check the review step at desktop and mobile widths.
- Run the focused checkout tests and confirm the preview builds without errors.

## Technical details
- Limit changes to the review presentation in `CheckoutPage.tsx`; do not alter order creation, shipping quotes, Stripe, cart persistence, or database behavior.
- Continue using the current design tokens and shared buttons.
