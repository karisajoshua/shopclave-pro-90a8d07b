CREATE OR REPLACE FUNCTION public.guard_item_status_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pay text; _flow text[] := ARRAY['pending','processing','shipped','delivered'];
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF NEW.status = 'cancelled' AND OLD.status IN ('pending','processing') THEN RETURN NEW; END IF;
  SELECT payment_status INTO _pay FROM public.orders WHERE id = NEW.order_id;
  IF _pay IS DISTINCT FROM 'paid' THEN RAISE EXCEPTION 'Order is not paid yet'; END IF;
  IF array_position(_flow, NEW.status) IS NULL
     OR array_position(_flow, NEW.status) IS DISTINCT FROM array_position(_flow, OLD.status) + 1 THEN
    RAISE EXCEPTION 'Invalid status change % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_item_status ON public.order_items;
CREATE TRIGGER trg_guard_item_status BEFORE UPDATE OF status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_item_status_transition();

CREATE OR REPLACE FUNCTION public.sync_order_status_from_items()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _order_id uuid := NEW.order_id;
  _total int; _live int;
  _all_delivered boolean; _all_shipped boolean; _any_processing boolean;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status <> 'cancelled'),
    bool_and(status = 'delivered') FILTER (WHERE status <> 'cancelled'),
    bool_and(status IN ('shipped','delivered')) FILTER (WHERE status <> 'cancelled'),
    bool_or(status IN ('processing','shipped','delivered')) FILTER (WHERE status <> 'cancelled')
  INTO _total, _live, _all_delivered, _all_shipped, _any_processing
  FROM public.order_items WHERE order_id = _order_id;

  IF _total > 0 AND _live = 0 THEN
    UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = _order_id AND status IS DISTINCT FROM 'cancelled';
  ELSIF _all_delivered THEN
    UPDATE public.orders SET status = 'delivered', updated_at = now() WHERE id = _order_id AND status IS DISTINCT FROM 'delivered';
  ELSIF _all_shipped THEN
    UPDATE public.orders SET status = 'shipped', updated_at = now() WHERE id = _order_id AND status IS DISTINCT FROM 'shipped';
  ELSIF _any_processing THEN
    UPDATE public.orders SET status = 'processing', updated_at = now() WHERE id = _order_id AND status IS DISTINCT FROM 'processing';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_item_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications(recipient_id, title, message, type)
    SELECT o.user_id, 'Order Update', 'An item in your order is now ' || NEW.status, 'order'
    FROM public.orders o WHERE o.id = NEW.order_id AND o.user_id IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_item_status ON public.order_items;
CREATE TRIGGER trg_notify_item_status AFTER UPDATE OF status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_item_status();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders','order_items','shipments','tracking_events','notifications'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_vendor ON public.order_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);