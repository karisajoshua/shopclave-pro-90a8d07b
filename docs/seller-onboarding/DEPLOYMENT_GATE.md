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
2. Review draft migrations 001–017 in numeric order, including `SECURITY DEFINER` authorization and JSON draft schema. Never run these blindly.
3. Before launch, add server-enforced country-specific required fields and document requirements and versioned published policies; verify policy links, retention and privacy terms.
4. Review private KYC bucket, owner-upload registration, short-lived administrator signed URLs and audited document review (draft migrations 011–012 and 015–016). Add malware scanning, document retention, access monitoring and provider evidence reconciliation before production. No identity uploads to public buckets or generic JSON.
5. Build the approval transaction to validate KYC and prevent duplicate vendor creation. Do not equate approved seller status with verified payouts.
6. Transactional notification outbox draft (014) queues application events. A token-protected Resend delivery worker and atomic claim/ack SQL drafts are implemented (017). Configure verified sender, `RESEND_API_KEY`, `SELLER_NOTIFICATION_FROM`, `SELLER_NOTIFICATION_WORKER_TOKEN` and a trusted scheduled HTTP caller. Test delivery, retries and provider idempotency before enabling.
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

## Review constraints
- Do not configure empty `required_documents` if manual KYC is expected: the KYC RPC refuses verification without independent evidence requirements.
- Admin document access is audited when a 60-second signed URL is issued; the system cannot prove a human actually inspected its contents. Human verification training and a documented decision remain necessary.
- No country rules or policy URLs have been inserted, so the final submission flow is fail-closed until reviewed configurations exist.
- Existing Paystack integration elsewhere in Barakaz remains unchanged. This feature only creates Stripe Connect accounts.
