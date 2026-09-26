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
