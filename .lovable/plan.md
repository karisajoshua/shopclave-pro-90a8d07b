## Problem

Two related issues at checkout:

1. **Delivery fee doesn't change with address.** Shippo returns no rates for most Kenya-domestic routes (no local carriers configured), so the edge function falls back to `synthesizeEstimate()` — which is based only on parcel weight, not destination. Same KES amount regardless of whether the buyer is in Nairobi or Mombasa.
2. **Only one option is shown when Shippo is empty.** The fallback returns a single "Estimated · Standard delivery" row, so the buyer can't pick a carrier or speed.

## Fix

### 1. `supabase/functions/get-shipping-rates/index.ts` — destination-aware multi-option estimate

Replace the single `synthesizeEstimate()` with a small KE-aware pricing engine that produces **three options** (Economy / Standard / Express) priced from:
- **Zone** derived from origin city vs destination city:
  - `same_city` (e.g. both Nairobi) — base ~250 KES
  - `intercity_ke` (different KE city) — base ~550 KES
  - `remote_ke` (small towns / counties outside main hubs) — base ~750 KES
  - `international` (origin or destination outside KE) — base ~1,800 KES
- **Weight surcharge**: `kg × per-kg rate` (per-kg differs by zone: 120 / 180 / 220 / 600).
- **Service multiplier**: Economy ×0.85 (5–7 days), Standard ×1.0 (3–5 days), Express ×1.6 (1–2 days).
- Round each to nearest 50 KES, min 200.

Hub list for `same_city`/`intercity` classification: Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Thika, Nyeri, Machakos, Kakamega, Meru. Anything else in KE → `remote_ke`.

Each generated rate uses a realistic carrier label so the buyer sees company names:
- Economy → `G4S Courier` / `Easy Coach Parcels`
- Standard → `Wells Fargo Courier` / `Fargo Courier`
- Express → `Sendy Express` / `DHL Express` (international)

These are **estimates** (`is_estimate: true`) — clearly labeled in the UI. If Shippo *does* return real rates, those win (existing behavior preserved); estimates only fill in when Shippo returns nothing or errors.

Response shape stays the same; each rate keeps `rate_id`, `provider`, `service`, `amount`, `currency`, `estimated_days`, `duration_terms`, `is_estimate`.

### 2. `src/pages/CheckoutPage.tsx` — re-fetch when address changes

- `handleConfirmAddress` already clears rates. Also re-run the fetch effect when `address.city`/`addressLine`/`country` change after a confirm (currently the effect only depends on `activeStep` + `addressConfirmed`, so editing the address and re-confirming works, but quietly typing without re-confirming doesn't — which is fine; the "Save & Continue" reset is the trigger).
- Add a subtle line under the rate list when `is_estimate` is true on the selected rate: *"Estimated rate based on destination — final cost confirmed by carrier."*
- Auto-select the cheapest rate (already done) but expose all three so the buyer can upgrade to Express.

### 3. Out of scope

- No DB schema changes, no new secrets.
- `create-order` already persists whichever rate is selected (carrier + service + amount), so no order-side changes.
- Vendor warehouse fallback to Nairobi stays as-is.

## Technical notes

- All pricing constants live in a `KE_ZONE_PRICING` object at the top of the edge function for easy tweaking.
- City matching is case-insensitive, trimmed, and ignores punctuation.
- International detection: `toISO(destination) !== "KE"` OR origin country isn't KE.
- Each estimate's `rate_id` is `est-{vendorId}-{service}` so React keys stay stable and selection works.
