# Barakaz Global Seller Onboarding — implementation contract

Status: DESIGN / DEVELOPMENT ONLY. No migrations applied, no live provider onboarding enabled.

## Existing compatibility
- Preserve existing auth users and vendors; current vendor statuses and vendor dashboard access must not be silently reinterpreted.
- Existing VendorRegisterPage inserts a pending vendor directly. Migrate this route to the wizard only when backend authorization and migration tests pass.
- Existing VendorPayments uses Paystack subaccounts for selected African countries. Do not imply Stripe Connect already works.
- Existing AdminVendors updates vendor status directly. Replace with server-validated review actions after migration.
- Keep application review distinct from payout verification and seller suspension.

## Wizard and progress
Account -> Business -> Verification -> Store -> Payout -> Agreements -> Review & submit.
Account creation may be skipped for authenticated buyers who choose to sell.
Autosave on step transitions and debounced changes; explicit Save and exit. Resume from persisted step, never browser-only state.
Show Submitted / Under review / More information required / Approved / Rejected status timeline.

## Proposed tables (review against deployed schema before migration)
- seller_applications: id, user_id, vendor_id nullable, status (draft, submitted, under_review, more_information_required, approved, rejected), current_step, country_iso2, business_type, business_legal_name, registration_number nullable, business_address jsonb, categories jsonb, submitted_at, reviewed_at, reviewed_by, decision_reason, revision integer, created_at, updated_at. Enforce one open application per user or explicit resubmission revision.
- seller_verification_requirements: versioned country/business-type rules with applicability, effective dates, supported provider, enabled flag; fallback to manual review rather than inventing jurisdiction rules.
- seller_verification_records: application_id, requirement_id, document storage key or provider reference, verification status, reviewer, reviewed_at, rejection reason. No public identity document URLs or raw ID numbers.
- seller_store_profiles: application_id, store name, logo object key, description, categories, ship-from and return addresses.
- seller_payout_accounts: application_id/vendor_id, provider, country, external account ID, onboarding state, provider verification state, charges_enabled, payouts_enabled, last_synced_at; unique provider/external ID. No raw bank credentials.
- seller_agreement_acceptances: application_id, agreement key, immutable version/hash, accepted_at, user_id, IP metadata if privacy-approved. Require all applicable current versions at submission.
- seller_application_events: application_id, actor_id, previous_status, next_status, reason, event timestamp; append-only.
- seller_country_capabilities: country_iso2, registration_enabled, fulfillment_enabled, payout_provider, payout_enabled, last_verified_at; unsupported combinations fail closed.

## Server-enforced transition rules
Draft -> Submitted -> Under Review -> (More Information Required -> Submitted) OR Approved/Rejected.
Admins can move Submitted -> Under Review, request information, approve, reject; every decision logged.
No seller can approve their own application or set payout flags. Review actions must use authorized RPC/Edge Function, not arbitrary client table updates.
Approved seller access depends on approved application AND existing vendor account status; payouts require separate provider-confirmed eligibility.
Resubmission must preserve previous documents/decisions and use revision history. Prevent double submissions via idempotency keys and DB uniqueness.
Never assume an external provider's onboarding redirect means verification passed. Verify signed webhooks or provider server API.
Protect verification files with private buckets, narrow object policies, signed short-lived read URLs for authorized reviewers, retention/deletion policy and malware/file-type checks.

## Country and provider rules
Country ISO 3166-1 alpha-2. Configurable rules per country and business type; Canadian corporations and Chinese companies are different configurations, not hard-coded legal assumptions.
Stripe Connect only when supported for the Barakaz platform account, seller country, business type, requested capabilities and cross-border payout model. Verify current provider eligibility before enabling; do not promise universal support.
Preserve existing Paystack integrations for supported countries after provider validation. Unsupported countries may save a draft or apply for manual review, but payouts remain disabled.
Store tax registration data separately from identity verification; do not collect tax numbers without jurisdiction-specific requirements and privacy review.

## Implementation phases
1. Live schema/policy/provider audit and migration compatibility report.
2. Reviewed additive migrations + RLS + private storage + status-transition RPC + tests.
3. Wizard UI, autosave/resume, country-rule engine, document upload, agreements.
4. Admin review console, request-info notifications, vendor activation and audit log.
5. Provider onboarding + webhook verification + payout gating.
6. Country fixtures for CA and CN, individual/sole proprietor/company, abandoned/resumed drafts, failed uploads, rejected/resubmitted cases, concurrent admin actions, unauthorized access, provider webhook replay.

## Release acceptance
- Existing approved vendors remain operational.
- No seller can read another seller's private application or documents.
- Public cannot enumerate identity documents; admins only with least privilege.
- Draft survives logout/login and does not create duplicate vendor records.
- Approval does not falsely show payouts enabled.
- Only approved sellers can publish products, subject to existing product moderation.
- Review and provider webhook transitions are atomic and idempotent.
- No live activation until integration tests and manual compliance review pass.
