-- Add provider-neutral payment metadata and Stripe references without disturbing Paystack.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_key
  ON public.orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_key
  ON public.orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_provider_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_provider_check
  CHECK (payment_provider IS NULL OR payment_provider IN ('paystack', 'stripe'));

COMMENT ON COLUMN public.orders.payment_provider IS
  'Payment processor selected for this order. Existing orders may be NULL.';
