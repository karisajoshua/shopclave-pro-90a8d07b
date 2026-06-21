# Switch Stripe Connect to Live Mode

## Problem
When a vendor clicks "Connect Stripe account" on `/vendor/payments`, Stripe opens its **sandbox/test** onboarding flow instead of the real live-mode onboarding. This is because the `STRIPE_SECRET_KEY` currently stored in the backend is a **test key** (starts with `sk_test_...`). Stripe decides test vs. live purely from the secret key used — there is no code flag to toggle.

The three edge functions that use Stripe all read the same secret:
- `supabase/functions/stripe-connect-onboard/index.ts`
- `supabase/functions/stripe-connect-status/index.ts`
- `supabase/functions/create-stripe-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

So replacing the key fixes vendor onboarding **and** real card checkouts in one go.

## Plan

1. **You activate your Stripe account in live mode** (if not already done) at dashboard.stripe.com → toggle "Test mode" off → complete business activation. Stripe Connect must also be enabled on the live account (Connect → Settings → enable Express accounts, set branding, set the platform profile).

2. **Provide the live secret key.** I'll request it via the secure secret tool. You'll grab it from Stripe dashboard (live mode) → Developers → API keys → **Secret key** (starts with `sk_live_...`). I'll update `STRIPE_SECRET_KEY` with this value — no code changes needed.

3. **Update the Stripe webhook for live mode.** The webhook endpoint signing secret is different in live vs. test. After switching, you'll need to:
   - In Stripe dashboard (live mode) → Developers → Webhooks → add endpoint pointing at the existing `stripe-webhook` function URL, subscribing to the same events the test webhook uses.
   - Copy the new signing secret and I'll update `STRIPE_WEBHOOK_SECRET` with it.

4. **Vendors who already onboarded in test mode will need to redo it.** Their `vendor_stripe_accounts.stripe_account_id` rows point to test-mode accounts that don't exist in live mode. After the key swap, the next call to `stripe-connect-status` for those vendors will fail with "No such account". Options:
   - (a) Clear `vendor_stripe_accounts` rows so vendors re-onboard cleanly, or
   - (b) Leave them — the Payments page will show an error and they'll have to contact support.
   I recommend (a) since you mentioned the marketplace is still pre-launch. Let me know which you prefer.

5. **Verify** by signing in as a test vendor, clicking "Connect Stripe account", and confirming the Stripe page no longer shows the orange "TEST MODE" banner.

## Technical details

- No source code changes are required — Stripe's mode is determined entirely by the API key prefix (`sk_test_` vs `sk_live_`).
- The `apiVersion: "2024-12-18.acacia"` pin stays the same.
- `vendor_stripe_accounts` schema is unchanged.
- Live mode means real charges. Test cards like `4242 4242 4242 4242` will be rejected once switched.

## Questions before I implement
- Confirm your Stripe live account is activated and Connect (Express) is enabled.
- Confirm option (a) wipe existing `vendor_stripe_accounts` rows, or (b) leave them.
