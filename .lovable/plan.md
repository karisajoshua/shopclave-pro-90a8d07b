# International seller eligibility: audit and plan

Read-only audit. Nothing was changed.

## What exists today (verified)
- Database: 2 seller applications (both CA), 0 payout accounts, **0 country rules**, and every vendor ledger entry is in CAD.
- `seller_country_requirements` columns: country, business_type, rules_version, stripe_connect_enabled, required_documents, required_fields, reviewed_at. There is **no status, no cross-border flag, no settlement currency and no source/evidence fields**.
- `seller_payout_accounts` records a country and currency but nothing is enforced. `seller-stripe-connect` creates `type=express` using the applicant's country, with no service agreement (`tos_acceptance.service_agreement`), which cross-border accounts need.
- `seller-stripe-webhook` only syncs charges/payouts/details_submitted. It doesn't check the account's country or its capabilities.
- Checkout (`create-order`) only accepts Canadian *buyer* addresses. Seller shipping origin (`warehouse_address`) is checked by a validator that mirrors the checkout check. Shipping quotes, tax (GST/HST as Barakaz, the marketplace facilitator) and the ledger all assume a Canadian domestic flow in CAD.

## Things that wrongly suggest every country is eligible
1. The seller signup country picker lists **every country**, and the notice says "Drafts are welcome worldwide". A seller can invest a lot of effort before learning their country isn't supported.
2. The seller types (individual / sole proprietor / company) are the same for every country, with no local wording or requirements.
3. `stripe_connect_enabled=true` would be the **only** gate. It can't tell apart "Stripe supports this country", "cross-border is allowed for a Canadian platform" and "we reviewed it".
4. `seller-stripe-connect` passes any country to Stripe. If an admin mistakenly enables a row, it would try to create an account without the cross-border service agreement.
5. There's no check that a foreign seller's shipping origin can actually deliver to Canadian buyers (customs, duties, shipping quotes). Domestic Canadian flat rates would be applied as if the parcel ships inside Canada.
6. Tax treats every sale as domestic Canadian supply. Imported goods (duties, GST at the border, non-resident rules) are not modelled.

## Proposed model (data-driven, fails closed)
New `seller_country_eligibility` table (or extend the current one), one row per country plus business type:
- `status`: `unsupported` | `pending_manual_review` | `stripe_connect_supported` | `cross_border_permitted`
- `stripe_service_agreement`: `full` | `recipient` | null
- `settlement_currency`, `payout_currency`
- `evidence_url`, `evidence_checked_at`, `reviewed_by`, `reviewed_at`, `rules_version`
- `shipping_origin_allowed` (bool), `notes`
- **The default for any country without a row is `unsupported`.** No country is pre-filled except CA, and only once you confirm it with Stripe evidence. I won't assert any foreign country without Stripe's official documentation.

Rules:
- Onboarding and Connect are only allowed when status is `stripe_connect_supported` (for CA, domestic) or `cross_border_permitted` (foreign, with `recipient` agreement and `evidence_checked_at` set) **and** `reviewed_at` is set.
- Only admins can change it, through a security-definer RPC that records who made the change and why.

## Implementation steps (need approval, nothing live)
1. Database migration: add the fields/status above. Existing 0 rows, so no data is lost. Keep reads admin-only, plus a public view with only country, status and a friendly label.
2. Server: update `submit_seller_application` and `seller-stripe-connect` to check status; send `tos_acceptance[service_agreement]=recipient` for cross-border and `full` for domestic; reject a country mismatch between the Stripe account and the application.
3. Webhook: store the account's `country` and `capabilities.transfers`; mark payouts not eligible if they differ from the approved row.
4. Seller signup page: show a status badge in the country picker ("Available", "Coming soon – join waitlist", "Not supported"); replace "Drafts are welcome worldwide"; only continue past step 2 when the country is eligible.
5. Shipping and tax: keep foreign-origin sellers blocked from checkout until the international customs/duties design (already drafted) is live. Add a `vendors.ship_from_country` check that blocks non-CA origins at checkout.
6. Ledger: keep CAD; record `payout_currency` per account; no FX conversion until it's designed.
7. Admin: an eligibility page to review rows, with a required evidence link.
8. Tests: status gating, unknown country falls back to unsupported, service agreement choice, webhook mismatch.

## Needed from you before switching on any country
- Stripe's official Connect country list and cross-border payouts documentation for a Canadian platform, confirmed on your live Stripe account (Settings → Connect).
- Legal/tax sign-off for non-resident sellers and imports.
