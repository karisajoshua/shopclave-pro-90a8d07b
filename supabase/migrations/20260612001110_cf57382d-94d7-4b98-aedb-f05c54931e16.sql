
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

CREATE INDEX IF NOT EXISTS orders_stripe_payment_intent_idx
  ON public.orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS orders_stripe_checkout_session_idx
  ON public.orders(stripe_checkout_session_id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS stripe_destination_account text;

CREATE INDEX IF NOT EXISTS order_items_stripe_transfer_idx
  ON public.order_items(stripe_transfer_id);
