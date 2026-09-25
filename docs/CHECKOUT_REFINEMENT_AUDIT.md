# Checkout refinement audit — 25 September 2026

## Existing functionality retained
- CAD catalogue and order base prices, geo-detected/manual local-currency display.
- Server-issued, short-lived Shippo quotes per vendor, with actual CAD-converted shipping prices and optional estimated days.
- Authenticated order creation and server-side quote validation.
- Paystack checkout and verification; Stripe is proposed in this branch.
- Existing order confirmation page and order tracking.

## Changes on this branch
- Address now captures Canadian province/territory and validates Canadian postal-code format.
- Other countries can supply region and postal/ZIP code.
- Carrier-specific estimated delivery dates are displayed when supplied, instead of claiming a generic 3–7 day promise.
- The order summary offers explicit links to edit address, delivery and cart.
- Checkout labels its current total **before applicable taxes**.

## Must complete before live rollout
1. **Canadian GST/HST/PST/QST**: no reliable server-side tax calculation was found in the inspected order creation flow. Tax liability depends on merchant-of-record, product tax codes, shipping taxability, registrations and destination. Choose a tax engine (e.g. Stripe Tax where eligible or a dedicated tax provider), configure nexus/registrations and product tax classifications, and compute a signed/server-side quote. Persist jurisdictional breakdown and ensure the exact same total is used by order creation, Paystack initialization, Stripe initialization, receipts and refunds. Do not use hard-coded province percentages.
2. **Currency**: CAD is canonical. Display conversion is informational. Stripe currently charges CAD, Paystack converts to supported buyer currency. Show the *actual charge currency* and exchange-rate disclosure for each method.
3. **Stripe lifecycle**: webhook must be tested against the existing ledger schema, fulfilment invocation and refund reconciliation. Do not merge/deploy until regression tests pass.
4. **Buyer protection**: link to actual published terms/returns policy, confirm claims with operations and define escrow/dispute rules before presenting guarantees.
5. **Confirmation**: do not display a success icon for pending payments or claim funds were not taken merely because verification failed; reconcile against provider/webhook.
6. **Address**: test Shippo province and postal-code acceptance; optionally normalize province names to ISO 3166-2 codes.
7. **Delivery**: distinguish transit estimates from handling time; never guarantee arrival dates unless contracted.
8. **Tests**: Canadian and non-Canadian addresses, Shippo quote expiry, multiple vendors, tax-exempt products, each payment provider, pending/failed payment and refund.

This branch is a work-in-progress. No tax-inclusive live-payment readiness is claimed.
