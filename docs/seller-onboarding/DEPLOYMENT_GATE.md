# Seller onboarding: deployment and security gate

Development branch: `feature/seller-onboarding-global-v2`. No draft SQL has been applied to production.

## Stripe Connect only
- Set `STRIPE_SECRET_KEY` for the intended environment.
- Set `STRIPE_CONNECT_WEBHOOK_SECRET` to the dedicated Connect webhook endpoint signing secret (not the checkout webhook secret).
- Configure `SELLER_ONBOARDING_RETURN_URL` to an HTTPS Barakaz seller registration route.
- Keep `STRIPE_LIVE_CONNECT_ENABLED` unset/false until live-account and legal reviews are complete.
- Register `seller-stripe-webhook` for connected-account `account.updated` events.
- Disable JWT verification **only** on the signed webhook endpoint; retain JWT verification on the authenticated `seller-stripe-connect` endpoint.
- Enable country/business combinations in `seller_country_requirements` only after verifying current Stripe Connect platform-country/cross-border eligibility, business requirements and settlement capabilities. There are no pre-enabled countries.
- No Paystack onboarding or fallback. Legacy Paystack checkout/withdrawal code is outside this feature and requires a separate approved migration before removal.

## SQL review and controlled rollout
1. Confirm the actual deployed `vendors`, `user_roles` and storage schemas. Check ownership, existing RLS, migration history and role permissions.
2. Review draft migrations 001–011 in numeric order, including `SECURITY DEFINER` authorization and JSON draft schema. Never run these blindly.
3. Before launch, add server-enforced country-specific required fields and document requirements and versioned published policies; verify policy links, retention and privacy terms.
4. Complete secure verification workflow: Stripe-hosted Connect identity checks where eligible; separately review any documents Barakaz requires with private bucket, short-lived URLs and audited access. No identity uploads to public buckets or generic JSON.
5. Build the approval transaction to validate KYC and prevent duplicate vendor creation. Do not equate approved seller status with verified payouts.
6. Add notification outbox and delivery worker for application submission, more-information requests, decisions and provider-status changes.
7. End-to-end test draft resume, document ownership, agreement versions, admin authorization, country eligibility, webhook signatures/replays/out-of-order events and approval vs payout state.
8. Only then migrate existing vendors and activate the new registration feature behind a feature flag.

## Current implementation
- Six-step React wizard with draft saving and resume; account reuse.
- Country/type-gated Stripe Connect account creation and hosted onboarding redirect.
- Signed Stripe Connect webhook with transactional idempotent payout-status update.
- Draft country eligibility, server-validated submission and immutable policy acceptance RPCs.
- Admin review queue with under-review, request-information and rejection decisions.
- Draft atomic administrator approval is KYC-gated and does not change Stripe payout verification.\n- Draft private KYC storage allows owner uploads, but upload registration, malware scanning, reviewer signed URL access and verified document workflow are NOT yet implemented.\n- The current KYC review RPC records an administrator decision; administrators must not mark KYC verified without independent evidence.\n- Country-specific agreements require actual published, versioned seller policy documents; none are silently substituted with general marketplace terms.
- No automatic submission until real country rules, document flow and published seller policies are available.
- No production migration, Edge Function deployment or live Stripe account verification performed.
