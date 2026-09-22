# ShopClave / Barakaz production checklist

## Implemented
- Server-issued shipping quotes and paid-order Shippo label purchase.
- Explicit manual fulfilment path when no live carrier rate exists.
- Vendor manual carrier/tracking/reference capture.
- Tracking timeline and vendor fulfilment UI.
- Admin returns/refunds route and Paystack refund function.
- Financial-field protection migrations.
- Read-only Barakaz catalogue bridge.
- Restricted server-to-server Barakaz transactional bridge.
- Bridge credentials are environment-only and are never committed to source.

## Required server secrets
- BARAKAZ_BRIDGE_URL
- BARAKAZ_BRIDGE_SECRET
- SHIPPO_API_TOKEN
- SHIPPO_WEBHOOK_SECRET
- PAYSTACK_SECRET_KEY

Never expose these through VITE_* variables.

## Deployment
1. Apply pending Supabase migrations in timestamp order.
2. Deploy barakaz-catalog with JWT verification enabled.
3. Deploy barakaz-sync with JWT verification enabled.
4. Deploy/update shippo-purchase-label, shippo-webhook, paystack-webhook and paystack-refund.
5. Configure Shippo webhook secret and endpoint.
6. Run Supabase security/performance advisors.
7. Regenerate TypeScript database types after migrations.

## Acceptance tests
- Active catalogue loads locally; bridge fallback works when local catalogue is empty.
- Unauthenticated bridge call is rejected.
- Browser cannot invoke transactional bridge successfully.
- Checkout cannot reuse/tamper with a shipping quote.
- Payment webhook replay creates no duplicate ledger credit or shipping label.
- Estimate-only shipment becomes manual_booking_required.
- Vendor can only update its own shipment.
- Manual shipment requires carrier plus tracking/reference.
- Integrated shipment provider/financial fields cannot be changed by vendor.
- Approved return can initiate refund; duplicate request is idempotent.
- Return/refund state and ledger are reconciled after provider confirmation.

## Release gate
Do not mark production-ready until migrations, Edge Functions and E2E tests have been run against the deployed Supabase project.
