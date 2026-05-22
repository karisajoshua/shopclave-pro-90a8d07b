## 1. Home page — "Load more" under Featured Products

**File:** `src/pages/Index.tsx`

- Add `const [visibleCount, setVisibleCount] = useState(10);` (reset to 10 on each visit).
- Switch the featured query to fetch a larger pool (e.g. `.limit(60)`) so paging stays client-side and fast.
- Render `displayProducts.slice(0, visibleCount)` in the grid.
- Below the grid, show a centered "Load more" button when `displayProducts.length > visibleCount`. Each click does `setVisibleCount(c => c + 10)`.
- Use existing `Button` with `variant="outline"`, primary text color. Hide for the demo state (first-run) since there are only 8 demo items anyway.
- Add a `home.loadMore` translation key (English + existing locales).

## 2. Shipping estimate at checkout

**Root cause:** `get-shipping-rates` returns a per-vendor error ("Vendor has not set a shipping origin address") when `warehouse_address` is empty, so no rates come back and the order summary shows "—". Most live vendors have not yet filled the new warehouse field, so buyers never see an estimate.

**Fix — fall back to a platform default origin so an estimate always renders:**

**File:** `supabase/functions/get-shipping-rates/index.ts`
- If a vendor's `warehouse_address` is missing/incomplete, fall back to a platform default origin (Nairobi, KE):
  - `street1: "Moi Avenue"`, `city: "Nairobi"`, `zip: "00100"`, `country: "KE"`, `state: ""`, phone uses vendor phone or a platform default.
- Still flag `usedFallbackOrigin: true` in the response so the UI can show a small note ("Estimated from Nairobi — vendor origin not set").
- Keep existing parcel defaults (500 g, 20×15×10 cm) when product dimensions are missing.
- If Shippo still returns zero rates, synthesize a single estimated fallback rate (`provider: "Estimated"`, `service: "Standard delivery"`, amount based on weight × KES/kg with a min) so the buyer always sees a number. Mark `is_estimate: true`.

**File:** `src/pages/CheckoutPage.tsx`
- Show the `usedFallbackOrigin` / `is_estimate` note as a small muted line under that vendor block.
- In the right-side Order Summary, when `shippingTotal === 0` and rates are still loading, show "Calculating…" instead of "—"; once rates arrive, always show the amount.
- Move the `useEffect` dependency to also re-fetch when `items` change (in case cart updates mid-flow), and clear `shippingRates`/`selectedRates` when the address is edited and re-confirmed.

## 3. Out of scope
- No changes to vendor settings UI, order schema, or commission logic.
- No new env vars; fallback origin is hard-coded in the edge function (Nairobi default fits the marketplace).

## Technical notes
- Featured load-more is purely client-side over a 60-item pool — no extra Supabase round-trips on click.
- Edge function change is backward compatible: response shape unchanged except two optional flags (`usedFallbackOrigin`, rate-level `is_estimate`).
- `create-order` already persists whichever rate is selected, including the synthesized estimate, so no order-side changes needed.
