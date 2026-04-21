-- Allow 'processing' status on order_items and orders
DO $$
DECLARE
  _con record;
BEGIN
  -- Drop existing status check constraints on order_items
  FOR _con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', _con.conname);
  END LOOP;

  -- Drop existing status check constraints on orders
  FOR _con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%payment_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', _con.conname);
  END LOOP;
END $$;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_status_check
  CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled'));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled'));