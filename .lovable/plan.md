## Problem

The "Pay with Card" option on checkout never redirects to Stripe — it just calls `create-order` like Cash on Delivery. There's no edge function that creates a Stripe Checkout Session, so the existing `STRIPE_SECRET_KEY` and webhook aren't wired into the flow.

Additionally, the deployed `stripe-webhook` is crashing on boot (`Deno.core.runMicrotasks() is not supported`) because the Stripe SDK is being used in a Deno-incompatible way.

## Plan

### 1. New edge function: `create-stripe-checkout`
- Reads cart items + shipping address from the request.
- Validates the user via JWT (`getClaims`).
- Creates an `orders` row with `status='pending_payment'` and `payment_method='stripe'` (via the existing `create-order` logic or inline insert).
- Calls Stripe `checkout.sessions.create` with:
  - `line_items` built from the cart (name, image, unit price, qty)
  - `mode: 'payment'`
  - `success_url`: `{origin}/order-confirmation/{order_id}?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url`: `{origin}/checkout`
  - `metadata: { order_id }`
  - `customer_email`: shipping address email
- Returns `{ url }` to the client.
- Uses `Stripe` from `npm:stripe@17` with `httpClient: Stripe.createFetchHttpClient()` (Deno-compatible).

### 2. Update `CheckoutPage.tsx`
- In `handlePlaceOrder`, if `paymentMethod === 'stripe'`:
  - Call `create-stripe-checkout` instead of `create-order`.
  - On success, `window.location.href = data.url` to redirect to Stripe Checkout.
- Keep existing `create-order` path for Cash on Delivery / M-Pesa.

### 3. Fix `stripe-webhook`
- Rewrite using `npm:stripe@17` with `Stripe.createFetchHttpClient()` and `await stripe.webhooks.constructEventAsync(...)` (async variant required in Deno).
- On `checkout.session.completed`: look up order by `metadata.order_id`, set `payment_status='paid'`, `status='processing'`.

### 4. Stripe Dashboard reminder
After deploy, user should ensure the existing webhook subscribes to `checkout.session.completed`.

## Files

- **Create**: `supabase/functions/create-stripe-checkout/index.ts`
- **Edit**: `supabase/functions/stripe-webhook/index.ts` (Deno-compatible rewrite)
- **Edit**: `src/pages/CheckoutPage.tsx` (branch on payment method, redirect to Stripe URL)
- **Edit**: `supabase/config.toml` (add `[functions.create-stripe-checkout]` with `verify_jwt = false`, validate JWT in code)
