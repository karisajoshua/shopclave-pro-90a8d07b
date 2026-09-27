# Complete Seller Registration & Verification

## Goal
Replace the current premature one-page seller submission with a seven-step application. Sellers can start and save a draft from any country, but can submit only when every required step and that country’s verified rules are complete.

## Seller experience
1. **Seller account** — require sign-in/sign-up, then confirm full name, email, and phone. Password remains handled securely by Barakaz authentication.
2. **Business information** — collect seller type, legal name, optional registration number when applicable, searchable country, full address, and business category.
3. **Identity and business verification** — show only documents required by the selected country and seller type; accept private JPEG, PNG, or PDF uploads with clear pending/review states.
4. **Store setup** — collect store name, logo, description, product categories, ship-from address, and return address.
5. **Payout setup** — start Stripe Connect only where the country is explicitly supported; keep seller approval and payout verification as separate statuses.
6. **Seller agreements** — require the current version of all six specified seller policies and record each acceptance.
7. **Review and submit** — show a complete summary, highlight missing requirements, and expose the only “Submit for approval” action in this final step.

Every step will support Back, Save draft, and Save & continue. Returning sellers resume their last editable step. Changing country or seller type revalidates country-specific requirements and agreements.

## Submission and status rules
- Use: `draft → submitted → under_review → more_information_required → approved/rejected`.
- Final submission is server-validated and impossible until required profile, business, KYC documents, store, eligible payout setup, and agreements are complete.
- Global sellers may always create and save drafts.
- Submission fails closed for countries or business types without reviewed requirements, published agreements, and supported payout configuration.
- “More information required” applications become editable again without losing prior data or review history.

## Admin review
- Add a complete application detail view with business, store, KYC, agreement, and payout sections.
- Provide **Mark under review**, **Request more information**, **Reject**, and **Approve** actions with required review notes where appropriate.
- Approval requires independently verified KYC and creates or activates the vendor once, without marking payouts verified.
- Notify the seller when review status changes and grant the Vendor Dashboard only after approval.

## Backend and security
- Add the seller application, country requirements, policy versions, agreement acceptances, private document records, payout accounts, event history, and notification outbox through one reviewed additive migration sequence.
- Correct the existing drafts before use: no new foreign keys into managed authentication tables, explicit grants for every new public table, RLS on every table, and owner/admin/service-only policies matching each operation.
- Keep sensitive KYC files in private storage; sellers access only their own files and authorized reviewers receive short-lived audited access.
- Use restricted server functions for draft saving, submission, review, KYC decisions, approval, and Stripe status updates. Generic client updates cannot approve sellers or enable payouts.
- Preserve all existing vendors, Paystack compatibility, orders, payments, and financial history.

## Integration safeguards
- Keep Stripe Connect test-only unless live Connect is separately authorized.
- Do not fabricate country rules, tax details, KYC requirements, business data, or payout availability.
- Do not enable final submission for any country until its rules and published policies are configured and reviewed.
- Configure and verify signed Stripe Connect webhooks and seller notification delivery before enabling submission for a country.

## Validation
- Add tests for draft resume, required-field gating, country/type changes, private document ownership, agreement versions, submission prerequisites, admin authorization, KYC-gated approval, duplicate prevention, status transitions, and approval/payout separation.
- Verify seller and admin screens on desktop and mobile, including a full draft/resume path and all blocked submission states.
- Run the seller-onboarding tests, relevant security checks, and preview verification before reporting completion.

## Rollout
- Build and test behind the existing onboarding feature flag.
- Apply the reviewed additive database migration and deploy the required seller functions.
- Keep the flag off until the backend, storage, policies, test Stripe Connect path, and at least one country configuration are verified.
- Do not publish the website or activate live payments without explicit authorization.
