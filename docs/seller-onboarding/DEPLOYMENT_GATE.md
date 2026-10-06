# Seller onboarding: deployment and security gate

Production inspection (2026-10-07): the seller-onboarding schema and related RPCs are already present in the Barakaz backend. The numbered files under `migrations-draft/` are reference drafts and MUST NOT be blindly applied or replayed. Use live-schema diffs for any further migration.

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
- Seven-step React wizard with draft saving and resume; account reuse.
- Country/type-gated Stripe Connect account creation and hosted onboarding redirect.
- Signed Stripe Connect webhook with transactional idempotent payout-status update.
- Draft country eligibility, server-validated submission and immutable policy acceptance RPCs.
- Admin review queue with under-review, request-information and rejection decisions.
- Draft atomic administrator approval is KYC-gated and does not change Stripe payout verification.\n- Private KYC storage, upload registration, audited reviewer signed-URL access and document/KYC review RPCs are present in the inspected backend. Malware scanning, retention policy enforcement and provider-evidence reconciliation remain launch gates.
- Administrators must not mark KYC verified without independent evidence.
- Country-specific agreements require actual published, versioned seller policy documents; none are silently substituted with general marketplace terms.
- No automatic submission until real country rules, document flow and published seller policies are available.
- Production inspection found the seller schema plus `seller-stripe-connect`, `seller-stripe-webhook`, `seller-review-document`, and `seller-notification-worker` deployed. Live Stripe Connect configuration and an end-to-end seller test are still required.

## Review constraints
- Do not configure empty `required_documents` if manual KYC is expected: the KYC RPC refuses verification without independent evidence requirements.
- Admin document access is audited when a 60-second signed URL is issued; the system cannot prove a human actually inspected its contents. Human verification training and a documented decision remain necessary.
- Canada `ca-v1` country-rule rows exist for individual, sole proprietor and company, but remain fail-closed (`stripe_connect_enabled=false`, `reviewed_at` unset) until compliance, policy, Stripe and end-to-end checks pass.
- Existing Paystack integration elsewhere in Barakaz remains unchanged. This feature only creates Stripe Connect accounts.

## Safe merge gate
- The existing seller registration implementation is preserved as `LegacyVendorRegisterPage.tsx`.
- The new database-backed flow is isolated in `SellerOnboardingV2Page.tsx`.
- `VendorRegisterPage.tsx` defaults to legacy unless `VITE_SELLER_ONBOARDING_V2_ENABLED` is exactly `true`. Do not set that variable in production until all database, security and integration gates pass.
- GitHub CI is code-level validation only; SQL migrations remain drafts and are not executed by this PR.
