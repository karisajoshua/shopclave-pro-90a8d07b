# Fix crazy prices: convert legacy KES prices to CAD

## What's wrong

Every product in the catalogue was priced back when the platform stored Kenyan Shillings (median price 3,400, highest 189,999). The platform now treats every stored price as Canadian Dollars and converts it again for the visitor's country, so a Kenyan shopper sees roughly 93x the intended price.

The conversion code itself is correct — the stored numbers are the problem.

## The fix

Convert all existing stored prices from KES to CAD by dividing by the live KES to CAD rate (approximately 93), then rounding to a clean price ending in .99 style two-decimal values.

Affected data:
- 119 products: `price` and `compare_at_price`
- 5 product variants with an override price, 4 with a compare-at price

Not touched:
- Past orders and order items (they keep the amounts actually charged)
- Vendor ledger and balances

## Steps

1. Fetch the current KES to CAD rate and confirm the divisor with a preview of before/after prices for a handful of products.
2. Run one data update converting products and variants in a single pass, guarded so it only affects rows created before today.
3. Spot-check the catalogue in the preview as a Kenyan visitor and as a Canadian visitor to confirm the displayed prices are sane.

## Technical notes

- Data change via a single SQL update, not a schema migration.
- Rounding: `round(price / rate, 2)`, with a floor of 0.99 so nothing lands at 0.
- Vendor dashboard already labels the price field as CAD, so new listings are entered correctly and need no code change.
