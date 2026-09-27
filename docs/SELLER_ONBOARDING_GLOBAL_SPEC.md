# Global seller onboarding — implementation contract (development only)

## Existing baseline
- `src/pages/VendorRegisterPage.tsx` immediately inserts a pending `vendors` row.
- `src/pages/admin/AdminVendors.tsx` directly updates vendor approval status.
- `src/pages/vendor/VendorPayments.tsx` currently supports Paystack countries only.
Do not replace or bypass existing vendor data or payment security. Inventory and international checkout activation are separate.

## Seller flow
1. Auth: existing customers reuse Supabase auth; new sellers sign up, verify email, and provide name and E.164 phone. Never store passwords in application tables.
2. Business: individual / sole proprietor / company, country ISO 3166-1 alpha-2, legal name and optional/required registration number according to verified country-specific rules, registered address, tax fields only where applicable.
3. Verification: country + business-type requirements derived from server-controlled, versioned rules. Upload documents to a private Supabase Storage bucket with short-lived signed URLs; no public identity documents, no raw identity numbers in browser analytics or logs. Prefer regulated provider-hosted KYC where available.
4. Store: unique store slug, name, logo, description, categories, shipping origin and return address; validate countries against actual supported shipping lanes.
5. Payout: choose only actually supported provider/country/currency combinations; provider-hosted onboarding (Stripe Connect where legally and operationally supported; existing Paystack path only in verified supported countries). No invented universal Stripe Connect availability. Do not collect/store bank credentials directly. Provider callbacks/webhooks must verify signatures and set payout status server-side.
6. Agreements: explicit separate consent for seller terms, commissions/payouts, shipping, returns, prohibited goods and authenticity declaration. Store version, timestamp and authenticated account; immutable acceptance history.
7. Submit: validate all required stages server-side; transition draft -> submitted -> under_review. No seller-controlled approval/payout state.

## Separate state machines
`seller_application_status`: draft, submitted, under_review, more_information_required, approved, rejected.
`payout_verification_status`: not_started, pending, action_required, verified, restricted, disabled.
`kyc_status`: not_started, pending, action_required, verified, rejected.
Application approval does not imply payout verification. Vendor dashboard access after approval; payouts only when provider status and other payout rules permit. Existing vendor `status` remains backward-compatible until migration and role checks are proven.

## Database proposal — migration review required
- `seller_applications`: id, user_id unique, vendor_id nullable, application_status, current_step, country, business_type, business JSONB (non-document metadata), store JSONB, addresses JSONB, rules_version, submitted_at, reviewed_at, reviewed_by, review_reason, created_at, updated_at, version.
- `seller_verification_documents`: id, application_id, requirement_code, private_storage_path, verification_status, uploaded_at, reviewed_at; never expose raw document paths to other sellers.
- `seller_payout_accounts`: id, application_id, provider, provider_account_id, country, currency, verification_status, charges_enabled, payouts_enabled, last_webhook_at; service-role-controlled verification fields.
- `seller_agreement_acceptances`: id, application_id, policy_code, policy_version, accepted_at, accepted_by, immutable.
- `seller_application_events`: id, application_id, actor_id, previous_status, new_status, reason, created_at; immutable audit.
- `seller_country_requirements`: country, business_type, rules_version, required_fields, required_documents, allowed_providers, effective_at, reviewed_by. Do not populate legal requirements by guessing.
- Add unique indexes, FKs, state CHECKs, updated_at triggers, RLS owner draft read/write and admin review only. Lock approval/status/provider fields against client edits using separate admin/service-role RPCs. Restrict storage bucket via owner-scoped policies and short-lived URLs.

## Idempotency and concurrency
Draft autosave: upsert owned application using version check, no duplicate vendor rows. Server-side submit RPC validates required fields, documents, current policy versions, and status, then records event in one transaction. Admin review RPC checks role, uses row lock, requires reason for rejection/more-information, writes audit event and notification in same transaction. Provider webhooks verify signatures and event idempotency; never trust client-provided verified flags. Avoid sending email until transaction commits; use an outbox/worker.

## Admin
Applications queue by status/country/type; document review with signed URLs and access audit; request more information with explicit missing items; approve/reject with reason; show seller approval, KYC and payout verification as distinct badges. Sensitive document retention and deletion policy required.

## Acceptance tests
Existing buyer sign-in unchanged; draft resumes on another device; no duplicate application on repeated submit; invalid country/provider combination rejected; wrong-user document access denied; vendor cannot self-approve; admin decisions audited; stale policy requires reacceptance; repeated payout webhook idempotent; approved seller without payout verification cannot withdraw; country-specific rules tested against verified provider availability.

## Rollout
Phase A: audited schema + draft autosave and wizard; Phase B: private documents and admin review; Phase C: provider-hosted KYC/Stripe Connect or supported Paystack; Phase D: production security, E2E and country-by-country enablement. Feature-flag new flow; migrate existing vendors explicitly, never reset approvals. No automatic production migration or international payments activation.
