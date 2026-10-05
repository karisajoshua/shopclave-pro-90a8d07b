# Launch readiness: draft implementation handoff

Work is confined to GitHub. No production schema, credentials, registrations, seller records or catalog values were changed. Reviews and social-proof behavior remain unchanged. This branch is a draft; do not deploy directly.

## Implemented

- Atomic order creation reserves inventory and stores quotes, tax snapshots and shipments together. Persistent checkout keys prevent duplicate order creation after network errors. Signed Stripe payment confirmation commits stock and seller ledger entries together; failed/expired sessions release stock once.
- Admin Stripe refunds claim a server-calculated amount with proportional merchandise tax, prevent excess quantity refunds, and reconcile the same provider operation on retry. Seller transfer reversals are attempted before refunding an already settled line.
- Server-validated seller transfers require paid CAD orders, delivery plus seven days, resolved returns, a verified connected account and a reconciled ledger. Legacy withdrawal completion and creation controls are removed.
- Seller payment pages use Stripe. New Connect accounts use Accounts v2 recipient configuration; status reads current provider capabilities. Transfers and bank payouts are shown separately.
- Catalog prices consistently display CAD; Canada delivery scope is explicit. Invalid compare-at discounts are hidden. Admin product editing includes prices and parcel measurements; launch readiness identifies missing data.
- Tax registration approval is required, with an explicit test-key-only override. Legacy Paystack initialize/refund routes return HTTP 410; historical verification and webhooks remain.
- CI uses the committed npm lockfile and runs unit tests, SQL checks, TypeScript and production build.

## Migration and deployment prerequisites

The new SQL is mirrored in `drizzle/migrations/0020_launch_integrity.sql` and `supabase/migrations/20261005093410_launch_checkout_integrity.sql`. Apply exactly one copy. The historical Supabase directory alone is incomplete: the SQL test harness reconstructs pre-September Supabase migrations followed by Drizzle 0000–0020. Reconcile the target database migration history before applying. Take a backup and validate on a disposable hosted staging database first.

Deploy the migration and affected Edge Functions together with the frontend. Live checkout, Connect, refunds and transfers retain separate server flags. New flags are `STRIPE_LIVE_REFUNDS_ENABLED`, `STRIPE_LIVE_TRANSFERS_ENABLED`; the optional `ALLOW_UNAPPROVED_TAX_TEST_MODE` only works with test keys. Do not enable live flags merely because the build passes.

Stripe account creation requires Accounts v2 access and Express/application fee and loss responsibility settings. Configure signed Checkout/refund events on `stripe-webhook` and account capability/requirements events on `seller-stripe-webhook`. Review Accounts v2 request bodies against the account's supported API version before deployment. API reference: https://docs.stripe.com/api/v2/core/accounts/create .

## Remaining engineering acceptance before merge

- Exercise all Edge Functions against Stripe test mode and a hosted staging database, including timeouts, duplicate and out-of-order webhooks, overlapping stock requests and settlement/refund races. The SQL harness uses actual repository migrations in embedded PostgreSQL; auth/storage/network/cron are stubbed, and production category seed IDs are omitted. It does not prove Supabase deployment permissions or network/provider behavior.
- Add reservation reconciliation for abandoned checkouts and sessions whose provider creation succeeded but binding to the order failed. Never release an uncertain asynchronous payment based solely on elapsed time. Current expiry/failure webhook handling only releases a bound session. Old/unbound holds require operator reconciliation.
- Complete expired-session restart handling: the browser clears retry keys on explicit restart responses; completed sessions must first be reconciled to avoid another payment. Refresh consumed quotes when starting a new order.
- Reconcile transfer reversals and disputes, including failed refunds after successful reversal, and reflect net reversals in transfer history. Confirm platform balance and liability procedures before enabling live seller transfers. Original transfer amounts are not a bank balance.
- Review Connect creation retries beyond Stripe's idempotency retention window; review concurrent capability refresh ordering and existing Accounts v1 compatibility. Check seller application payout gates use recipient transfer readiness rather than merchant card-charge capability.
- Verify email enqueue responses and provider-level deduplication, and pending financial-operation recovery after the 23-hour automatic retry limit.
- Complete deployment docs/OpenAPI updates and end-to-end mobile/browser acceptance. No new browser acceptance test was executed in this checkpoint.

## Real launch data and operational acceptance

Supply actual packed weights/dimensions, correct low catalog prices, resolve invalid compare-at values, complete seller warehouse origins, publish reviewed seller agreements and country requirements, approve applicable tax registrations, and complete seller verification. These facts cannot be invented in code. Current rollout is Canada/CAD only.

After staging acceptance, deploy deliberately, verify signed webhooks, and perform a controlled live purchase, expiry/cancellation, partial refund and seller settlement with provider reconciliation. This branch does not claim a launched marketplace.
