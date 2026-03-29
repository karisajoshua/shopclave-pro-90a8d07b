
-- Allow admins to update orders (status, payment_status, etc.)
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to auto-sync order status when all order_items reach a status
CREATE OR REPLACE FUNCTION public.sync_order_status_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _all_delivered boolean;
  _all_shipped boolean;
  _any_processing boolean;
BEGIN
  _order_id := NEW.order_id;

  SELECT
    bool_and(status = 'delivered'),
    bool_and(status IN ('shipped', 'delivered')),
    bool_or(status IN ('processing', 'shipped', 'delivered'))
  INTO _all_delivered, _all_shipped, _any_processing
  FROM public.order_items
  WHERE order_id = _order_id;

  IF _all_delivered THEN
    UPDATE public.orders SET status = 'delivered', updated_at = now() WHERE id = _order_id;
  ELSIF _all_shipped THEN
    UPDATE public.orders SET status = 'shipped', updated_at = now() WHERE id = _order_id;
  ELSIF _any_processing THEN
    UPDATE public.orders SET status = 'processing', updated_at = now() WHERE id = _order_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_order_status
  AFTER UPDATE OF status ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status_from_items();
