## What's wrong today

`useLocale.formatPrice()` treats every stored price as **KES** and multiplies it by an exchange rate to the visitor's country. Vendors typing `1500` see it rendered as random foreign amounts. The base currency assumption is simply wrong.

## What you want

- Every product price in the database is in **Canadian Dollars (CAD)** — that's the platform's single source-of-truth currency.
- Vendors/admin enter prices in CAD (the form labels say so).
- Buyers automatically see the price converted to **their own country's currency** using live FX rates.
- If FX isn't available, fall back to showing the original CAD amount (never a wrong number).

No per-product currency picker, no database column for currency — one platform currency keeps it simple.

## Plan

### 1. FX helper — switch base to CAD

File: `src/lib/fx.ts`

- Change the fetch URL to `https://open.er-api.com/v6/latest/CAD`.
- Rename `convertFromKES` → `convertFromCAD` (same shape; just a different base).
- Bump the localStorage cache key to `barakaz_fx_rates_cad_v1` so old KES-based caches are discarded on first load.

### 2. Display layer — `formatPrice` converts from CAD

File: `src/hooks/useLocale.ts`

- `formatPrice(amountInCAD)` converts to `country.currency` using the new `convertFromCAD`.
- If the visitor is already in Canada → render as `CA$` directly, no conversion.
- If FX isn't loaded or the target rate is missing → render the value as CAD (`CA$ 1,500.00`) instead of a garbage number.
- Keep the `CURRENCIES_NO_DECIMALS` list (KES, UGX, JPY, …) for clean output.
- Add `CA` (Canada / CAD) to the country map if it isn't already the right default — it is already in the map.

### 3. Vendor & admin price inputs — label as CAD

Files:
- `src/pages/vendor/AddProductPage.tsx` (Step 2, Pricing) — add helper text under the Price field: "Enter price in Canadian Dollars (CAD)". Same for Compare-at price, Bulk price, and per-variant Price / Compare-at price.
- `src/pages/vendor/EditProductPage.tsx` — same helper text.
- `src/pages/admin/AdminCommissions.tsx` and anywhere admin sees price — clarify CAD.
- `src/pages/vendor/VendorProducts.tsx` — the hardcoded `$...` becomes `CA$...` (or use `formatPrice` so the vendor also sees their own country's converted value if they prefer; we'll use `CA$` literal in the vendor dashboard so vendors always see exactly what they entered).

No database change needed — column stays numeric, just understood as CAD.

### 4. Storefront — no caller changes required

Every component that currently calls `formatPrice(price)` already passes the raw numeric DB price. After Step 2's swap, those same calls auto-convert from CAD → buyer's currency. So `ProductCard`, `ProductDetailPage`, `CartPage`, `CheckoutPage`, `WishlistPage`, `VendorStorePage`, `SearchPage`, `Index`, `FlashSaleSection`, `BestDealsSection`, `OrderConfirmationPage`, `AdminOrders`, `VendorOrders`, `VendorEarnings` all work without edits.

### 5. Country picker — make the conversion obvious

File: `src/components/layout/Navbar.tsx` (and mobile equivalent if separate)

- Below the country selector, add tiny helper text: "Prices auto-converted from CAD to {currency_code}". For Canadian visitors it just says "Prices in CAD".

## What stays the same

- Stripe Connect onboarding work from prior turns — untouched.
- Cart math, commission, vendor payout, order totals — all still numeric (in CAD); the conversion happens only at display.
- Existing product rows — no migration, no backfill. They're already interpreted as CAD going forward.

## Verification

1. Set country picker to **Canada** → a product priced 1500 shows `CA$1,500.00`.
2. Set picker to **United States** → same product shows roughly `$1,098` (whatever the CAD→USD rate is).
3. Set picker to **Kenya** → shows roughly `KSh 142,000`.
4. Disable network, reload → falls back to `CA$1,500.00` instead of a wrong number.
5. Vendor dashboard still shows the price the vendor entered (`CA$1,500.00`).

## Files touched

- `src/lib/fx.ts`
- `src/hooks/useLocale.ts`
- `src/pages/vendor/AddProductPage.tsx`
- `src/pages/vendor/EditProductPage.tsx`
- `src/pages/vendor/VendorProducts.tsx`
- `src/components/layout/Navbar.tsx` (small helper text)

## Out of scope (ask if you want next)

- Storing each order's FX rate at checkout time so historical orders display the exact converted amount the buyer saw.
- Letting individual vendors price in their own currency.