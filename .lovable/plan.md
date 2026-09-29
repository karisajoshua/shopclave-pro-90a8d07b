# Seller Stripe Connect: restricted live key audit (read-only findings plus a proposed fix)

Nothing has been changed. No secrets, database, flags or deployments were touched.

## Findings

**1. STRIPE_SECRET_KEY mode.** It can't be classified without running code against the secret. My tools only list secret names, and I would have to deploy a probe function to check the prefix, which I did not do. So the `rk_live_` prefix is **user-stated, not verified by me**.
- The only indirect clue is this: checkout's guard (`_shared/stripeLiveGuard.ts`) treats both `sk_live_` and `rk_live_` as live. With `STRIPE_LIVE_CHECKOUT_ENABLED` unset, live checkout is blocked either way. So "checkout uses it" means checkout accepts the key *format*. It doesn't mean live charges are running.

**2. Why seller-stripe-connect rejects it.** A seller request hits these checks in order:
1. `seller_country_requirements` has **0 rows**, so every request stops first with 422 "Stripe Connect onboarding is not enabled for this seller country/type".
2. The key isn't `sk_test_` and `STRIPE_LIVE_CONNECT_ENABLED` is unset, so it returns 503 "Live Stripe Connect onboarding is disabled" (intended).
3. Even with the flag on, line 35 only accepts `sk_test_` or `sk_live_`. **`rk_live_` / `rk_test_` get 503 "Stripe configuration unavailable".** This is the real code mismatch compared with checkout.
- There are no `seller-stripe-connect` logs yet, so no seller has hit it.

**3. Minimum restricted key permissions (Stripe Dashboard, restricted key editor).**
- Connect → **Accounts: Write** (create Express account; Write includes Read)
- Connect → **Account Links: Write** (hosted onboarding link)
- Checkout still needs its current permissions, which stay as they are (Checkout Sessions: Write; plus PaymentIntents: Read and Refunds: Write if refunds use this key).
- Prerequisite: Connect must be activated on the live Stripe account, with Express accounts enabled and the platform profile completed. Otherwise account creation fails no matter which key is used.
- Caveat: this list comes from Stripe's permission model, not from reading the key's real permissions, which aren't visible to me.

**4. seller-stripe-webhook.**
- Deployed and reachable: GET returns 405, which matches the source. Signing is set to off only for this webhook, and seller-stripe-connect still requires sign-in. Both are correct.
- Logic: it checks the Stripe signature with a 5-minute window, handles only `account.updated`, and passes charges/payouts/details_submitted to `record_seller_stripe_account_event`. That step is idempotent and handles events arriving out of order.
- `STRIPE_CONNECT_WEBHOOK_SECRET` is set now, but no signed event has been received yet.
- Deployment mismatch: the deployed code can't be compared line by line. Behaviour so far matches the local source. `seller-stripe-connect` has never run, so nothing confirms it's deployed at the latest version.

## Minimal secure solution (proposed, needs approval)

1. **Code (one small change):** in `seller-stripe-connect`, replace the hard-coded `sk_` prefix checks with the shared key classifier:
   - test = `sk_test_` or `rk_test_`, live = `sk_live_` or `rk_live_`, anything else is rejected
   - live stays blocked unless `STRIPE_LIVE_CONNECT_ENABLED === "true"`, which I won't set
   - add a unit test for all four prefixes plus a bad one
2. **Deploy only `seller-stripe-connect`**, and only with your explicit go-ahead.
3. **You, in Stripe:** give the restricted key Accounts: Write and Account Links: Write, and confirm Connect Express is active.
4. **Still blocked after this, on purpose:**
   - no reviewed `seller_country_requirements` row (for example CA with a business type, with `reviewed_at` set). This is a database change that needs your approval and a check of Stripe's country eligibility
   - live Connect flag is off
   - no signed `account.updated` event has been verified yet

No secret is replaced and no live flag is turned on in this plan.

## Technical details
- File: `supabase/functions/seller-stripe-connect/index.ts` lines 31-36. Reuse `isLiveStripeKey` from `_shared/stripeLiveGuard.ts` and add a matching `isTestStripeKey`.
- Test: `src/test/` or a Deno test next to the shared guard.
