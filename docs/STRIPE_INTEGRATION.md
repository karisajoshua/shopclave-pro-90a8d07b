# Stripe payment integration

Barakaz supports Stripe as an additional hosted card-payment provider alongside Paystack.

## Required Supabase secrets
- `STRIPE_SECRET_KEY` — Stripe test/live secret key.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the `stripe-webhook` endpoint.

Never expose either secret to Vite/frontend code or commit it to GitHub.

## Webhook
Configure Stripe to send at least:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

The endpoint is:
`https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`

## Security
- Order amount is recomputed from server-side order items.
- Checkout creation is authenticated and ownership checked.
- The browser never marks an order paid.
- Webhooks verify Stripe signatures and reject stale signatures.
- Webhook events are idempotent through `webhook_events`.
- Amount/currency are reconciled before an order is marked paid.
- Shippo label purchase happens only after verified payment.

## Deployment
Apply the Stripe migration, deploy `stripe-initialize`, `stripe-verify`, and `stripe-webhook`, set secrets, then configure the Stripe webhook. Test in Stripe test mode before live keys.
