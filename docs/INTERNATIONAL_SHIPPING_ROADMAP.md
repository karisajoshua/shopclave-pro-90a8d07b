# International Shipping Roadmap (DDP / DAP)

Status: **development only**. Checkout blocks non-Canadian destinations; no international orders or payments are accepted. Domain logic: `supabase/functions/_shared/international.ts` (tests: `src/test/international.test.ts`). Schema draft: `docs/international/migrations-draft/001_international_customs.sql` (not applied).

## Principles
- CAD checkout, one payment across vendors, one landed-cost quote per vendor parcel.
- A mode (DDP or DAP) is shown only if a **verified, unexpired, provider-sourced** quote exists for that vendor, shopper and lane. `manual_admin` quotes are never offerable to customers.
- No fabricated duties, no generic worldwide rates. DDP requires provider-calculated duties and import tax.
- DAP requires explicit shopper acknowledgement (stored as `orders.dap_acknowledged_at`).
- Payment gate `international_gate` fails closed until carrier, landed-cost and export-tax integrations are all verified.

## Customer copy
- **DDP:** duties and taxes calculated by the carrier for the address are included; nothing more expected on delivery.
- **DAP:** total covers shipping only; destination customs may charge duties, taxes and a courier handling fee, not collected by Barakaz.

## Provider options
| Option | Rates | DDP | Landed cost | Notes |
|---|---|---|---|---|
| Shippo (already used domestically) | Yes, multi-carrier | Carrier-dependent (DHL Express, UPS, FedEx via Shippo support DDP flag on some lanes) | No native duty calc | Customs declarations + commercial invoice supported |
| DHL Express MyDHL API | Yes | Yes (DTP billing) on most lanes | Landed Cost API | Requires DHL Canada account |
| Zonos / Avalara / Easyship | Via partners | Yes | Yes (duty + tax guarantee options) | Additional contract and fees |
| Canada Post / Purolator | Yes | Limited/none for DDP | No | DAP only in practice |

**Lane availability** must be confirmed per carrier account (e.g. CA→US, CA→GB, CA→EU, CA→KE). Record verified lanes in admin config; everything else stays unsupported.

## Customs compliance
- Per line: HS code (6+ digits), country of manufacture, declared value (CAD), quantity, weight, description.
- Per parcel: origin (vendor warehouse), weight, dimensions.
- Existing columns: `hs_code`, `ships_from_country`, `customs_value_cad`, dimensions. Missing: `country_of_manufacture` (draft migration).
- Commercial invoice generation via carrier; CUSMA/USMCA origin statements where applicable.
- CBSA export declaration (CERS) for shipments over CAD 2,000 or controlled goods.
- Restricted destinations (sanctions/embargo) hard-blocked in code; restricted goods (batteries, liquids, cosmetics, knives) need a per-category rule set.

## Canadian export GST/HST
- Exports are generally zero-rated; Barakaz must retain proof of export (carrier tracking, commercial invoice, delivery confirmation) per order.
- Shipping services for exports may be zero-rated; confirm with advisor.
- Tax engine must return zero Canadian tax only when destination is outside Canada **and** export evidence will be captured. Advisor sign-off required before activation.

## Multi-vendor split and Stripe reconciliation
- Order total = items + Σ(vendor shipping + customs fee + DDP duties/taxes).
- DDP duties/taxes are platform liabilities (paid to carrier on duty bill), not vendor payout.
- Store per-shipment incoterm and quote snapshot; reconcile carrier duty invoices against collected DDP amounts; variance goes to an admin exception list.
- Stripe amount must equal the server-computed total to the cent; stripe-initialize must recompute from stored quotes.

## Returns
- International returns: vendor/admin approval, return label via same carrier where possible.
- Duties generally non-refundable unless carrier drawback applies; disclose in return policy before activation.
- Refunds of DDP duties only when the carrier refunds (e.g. refused shipments).

## Implementation phases
1. **Done (this batch):** domain types, validation, fail-closed gate, tests, schema draft, copy.
2. Vendor product UX: HS code, country of manufacture, declared value (needs migration for manufacture country).
3. Apply migration after review; server `get-international-quotes` function calling verified provider.
4. Checkout DDP/DAP selector with acknowledgement; create-order server re-validation.
5. Stripe recompute + reconciliation; label purchase with customs; export evidence storage.
6. Sandbox end-to-end per verified lane; then flip gate flags.

## Blockers
- Carrier account(s) with international + DDP enabled (DHL Express or Shippo-linked).
- Landed-cost provider decision and credentials.
- Tax advisor confirmation of export zero-rating and evidence rules.
- Restricted-goods policy and international return policy wording.

## Acceptance gate before merging PR #3 or accepting international payments
- Run `npm ci`, `npx vitest run src/test/international.test.ts`, `npx vitest run`, and `npx tsc --noEmit -p tsconfig.app.json` in an environment with repository dependencies; record logs and resolve failures. GitHub PR #3 remains draft until validated.
- Obtain a live-capable **test/sandbox** carrier account and landed-cost API credentials through secret storage; never commit API keys. Confirm actual DDP/DAP eligibility and provider-calculated duties for each origin/destination/carrier lane.
- Bind quote to immutable vendor parcel fingerprint, full normalized shipping address, user/guest session, currency conversion snapshot, carrier service and server-side expiration. Reject any changed basket, destination, vendor origin, customs line or expired quote before payment.
- Prevent duplicate vendor quotes and negative/non-finite amounts; enforce all quote ownership and RLS checks on the server, never trust browser-provided `verified` or monetary fields.
- Add idempotent server order creation and Stripe initialization; keep international and live-payment feature gates closed until independent staging end-to-end tests pass.
- Validate applicable export tax treatment and destination duties with a qualified tax/customs professional. Maintain country-specific sanctions and restricted-goods rules with a documented update owner; a static country list is not a substitute for screening.

CI: `.github/workflows/international-validation.yml` runs the international tests, full Vitest suite and TypeScript checks on PR changes; do not merge until results are visible and passing.

## Authenticated Shippo DAP quote endpoint (development draft)

`supabase/functions/get-international-quotes/index.ts` now has a server-only quote pipeline:
authenticate the shopper; re-read physical product, customs and warehouse data;
reject variants pending variant-level customs handling; validate all vendor parcels;
request live Shippo rates; convert using a live CAD FX snapshot; persist opaque
per-vendor DAP quote IDs with address, cart and parcel fingerprints. It fails
closed if any vendor lacks valid quotes. Canada-origin exports only.

**Not deployed or connected to checkout.** The international customs migration
must first be security-reviewed and applied to the correct Barakaz project.
The endpoint must be exercised against Shippo sandbox responses, including
carrier/customs document requirements, unavailable lanes, FX failure, and
multi-vendor partial failure. Its per-vendor insert can leave unused quotes
if the database fails; add cleanup/idempotency and expiry before launch.
Customer-visible quote IDs do not authorize payment: order creation must
recompute server-side fingerprints and atomically consume each verified quote.
Variant-specific customs, customs declaration/label purchasing, delivery
restrictions, tax treatment and explicit DAP acknowledgement remain blockers.
Keep the international payment gate disabled.

### Atomic quote claim (draft, not applied)
`docs/international/migrations-draft/002_atomic_quote_claim.sql` adds a
service-role-only transactional function to claim all selected vendor quotes
together. It locks quote rows, checks shopper, destination, cart/address/parcel
fingerprints, expiry, provider verification, duplicate vendors, DAP consent and
prior consumption. Any failure rolls back the entire claim.

**Critical integration requirement:** trusted order creation must authenticate
the caller, independently compute the exact vendor list, parcel fingerprints,
cart, destination and final total, verify that the order belongs to the shopper,
and call the claim in the *same database transaction as order creation*. Never
accept the RPC parameters or the returned amount as a standalone payment
authorization. Review SQL privileges, concurrency, rounding and cancellation
semantics before applying. Current application does not call this function.
