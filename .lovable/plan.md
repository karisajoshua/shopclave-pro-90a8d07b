# Canada-only seller onboarding: audit and smallest safe enablement

Read-only audit. Nothing changed. Launch scope confirmed: **Canadian vendors only**.

## Verified current state

- **Country rules table (`seller_country_requirements`):** primary key (country, business_type, rules_version); country must be 2 uppercase letters; business_type must be `individual`, `sole_proprietor` or `company`; `stripe_connect_enabled` defaults to false; required_documents and required_fields are text lists (default empty); `reviewed_at` date. Signed-in users can read it; only the backend can write. **0 rows today.**
- **The 2 existing applications:** both `CA` + `individual`, status `draft`, identity check `not_started`, never submitted. One rule row for CA/individual would cover both, but the CA signup picker offers all 3 seller types — each needs its own row (3 rows total) or those sellers stay fail-closed.
- **Submission rule (`submit_seller_application`):** needs (1) a matching enabled+reviewed country row, (2) all business/store fields, (3) a Stripe payout account started, (4) any country-required fields/documents, (5) all 6 published agreements accepted for that rules_version. Anything missing blocks submission. Because `seller-stripe-connect` checks the country row **before** the key checks, no Stripe account can be created until a row exists.
- **Agreements gate:** the 6 codes are seller_terms, commission_payout, shipping_fulfillment, returns_refunds, prohibited_products, product_authenticity. `seller_policy_documents` has **0 published documents**, and the page won't even show checkboxes without published documents for the rules version. Submission is impossible today even with a country row.
- **Admin review:** `review_seller_application` (approve/reject/more-info) and the admin queue page exist and are deployed.
- **Flags:** `STRIPE_LIVE_CONNECT_ENABLED` unset (stays that way); live checkout guard untouched. Return URL and Connect webhook secret are set.

## Smallest safe enablement (proposed, needs approval)

1. **Insert 3 country-rule rows (data change, needs your approval):**
   - country `CA`, one row each for `individual`, `sole_proprietor`, `company`
   - `rules_version`: `ca-v1`; `stripe_connect_enabled`: true; `reviewed_at`: now
   - `required_documents`: empty (admin reviews identity manually for now) or the codes you want — your call
   - `required_fields`: empty
2. **Publish the 6 seller agreement documents** under version `ca-v1` with real legal text and URLs. **Blocker: I can't write legal terms.** Provide the texts (or point to existing policy pages) and I'll insert them.
3. **Enable Stripe Connect on the platform account** (Stripe Dashboard → Connect, Express, Canada). **Blocker: only you can do this**, plus add Connect permissions to the restricted key.
4. **Test mode first:** use a `sk_test_` key, run one seller through signup → Stripe onboarding → webhook → submit → admin approve. Then switch keys to live and set `STRIPE_LIVE_CONNECT_ENABLED=true` only after that passes.

## Blockers summary
- Legal text for 6 agreements (from you)
- Stripe Connect activation + key permissions (from you, in Stripe)
- Rows 1–2 need your approval before I insert them
- Test end-to-end before any live flag

## Technical details
- Inserts go through the data tool (not a schema migration): `INSERT INTO public.seller_country_requirements (country,business_type,rules_version,stripe_connect_enabled,required_documents,required_fields,reviewed_at) VALUES ...`
- `seller_policy_documents` inserts: policy_code, policy_version `ca-v1`, title, document_url, published_at
- No code changes needed; gates already fail closed

## Canadian seller shipping and tax checks (verified)
- **Shipping origin:** the seller warehouse check requires a street, city, country, phone, and province and postal code for CA. It does **not** require the origin country to be CA, so a non-Canadian origin would pass. For a Canada-only launch, add a small server check at checkout: vendor origin country must be CA (a code change, needs approval).
- **Buyers:** checkout only accepts Canadian shipping addresses (already enforced on the server).
- **Tax:** GST/HST registration 784144644RT0001 has been in effect since 2026-09-25. **Buyers** in BC, QC, MB and SK are blocked (no provincial registration). The seller's province doesn't change tax, because Barakaz collects as the marketplace.
- **Shipping rates:** Shippo quotes need the seller's real package weight and dimensions. Products without them fail closed at checkout.

## Safe tests (no charges, no live accounts)
1. Unit tests for rule lookup: CA plus each seller type is allowed; a non-CA country or an unreviewed row is blocked.
2. Signup check in test mode (`sk_test_` key): one test seller account goes through the draft, the Stripe **test** Express link, the return to `/vendor/register`, and the signed test `account.updated` event updating the payout status.
3. Try to submit without published agreements and confirm the "not fully published" block shows. Then publish them and submit.
4. Admin approve/reject in the queue. Confirm no vendor is created before identity approval and payout eligibility.
5. Confirm `STRIPE_LIVE_CONNECT_ENABLED` and `STRIPE_LIVE_CHECKOUT_ENABLED` both stay unset throughout.

## Stripe restricted key permission check (safe, no secret exposure)
- The secret value never needs to be shown. The key's permissions are visible in the Stripe Dashboard: Developers → API keys → click the `rk_...` key → its permission list is shown without revealing the key itself.
- Minimum needed for seller onboarding: Connect → Accounts: Write, and Connect → Account Links: Write. Checkout keeps its own permissions (Checkout Sessions: Write; PaymentIntents: Read and Refunds: Write if refunds use this key).
- Alternative runtime check (test mode only, if ever wanted): call `GET /v1/accounts/{acct_id}` or create a throwaway **test** Express account with a test restricted key — a missing permission returns a clear `permission` error. Not needed now; the dashboard check is enough.
- From my side I can only confirm the secret name exists, never its value or permissions — the dashboard check is yours to do.
