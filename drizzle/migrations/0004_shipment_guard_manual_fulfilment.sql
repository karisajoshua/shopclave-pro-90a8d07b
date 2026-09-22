-- Vendors handling a manual (no live carrier rate) parcel must be able to record the
-- carrier they booked themselves, while integrated parcels stay fully server-managed.
CREATE OR REPLACE FUNCTION public.guard_shipment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _manual boolean;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  _manual := COALESCE(OLD.fulfilment_mode, 'integrated') = 'manual';

  -- Money, provider identifiers and routing are never vendor-writable.
  IF NEW.shipping_amount_cad IS DISTINCT FROM OLD.shipping_amount_cad
     OR NEW.shipping_amount_original IS DISTINCT FROM OLD.shipping_amount_original
     OR NEW.shipping_currency_original IS DISTINCT FROM OLD.shipping_currency_original
     OR NEW.fx_rate_to_cad IS DISTINCT FROM OLD.fx_rate_to_cad
     OR NEW.shippo_transaction_id IS DISTINCT FROM OLD.shippo_transaction_id
     OR NEW.shippo_shipment_id IS DISTINCT FROM OLD.shippo_shipment_id
     OR NEW.label_url IS DISTINCT FROM OLD.label_url
     OR NEW.commercial_invoice_url IS DISTINCT FROM OLD.commercial_invoice_url
     OR NEW.rate_id IS DISTINCT FROM OLD.rate_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
     OR NEW.is_estimate IS DISTINCT FROM OLD.is_estimate
     OR NEW.fulfilment_mode IS DISTINCT FROM OLD.fulfilment_mode
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
    RAISE EXCEPTION 'Only shipment workflow fields may be changed here';
  END IF;

  IF NOT _manual THEN
    IF NEW.carrier IS DISTINCT FROM OLD.carrier
       OR NEW.service IS DISTINCT FROM OLD.service
       OR NEW.tracking_number IS DISTINCT FROM OLD.tracking_number
       OR NEW.tracking_url IS DISTINCT FROM OLD.tracking_url
       OR NEW.manual_carrier IS DISTINCT FROM OLD.manual_carrier
       OR NEW.manual_tracking_number IS DISTINCT FROM OLD.manual_tracking_number
       OR NEW.manual_booking_reference IS DISTINCT FROM OLD.manual_booking_reference THEN
      RAISE EXCEPTION 'Carrier and tracking details are provided by the courier integration';
    END IF;
  ELSE
    -- Manual parcels: the booking may be recorded once, not rewritten later.
    IF OLD.manual_booked_at IS NOT NULL
       AND (NEW.manual_carrier IS DISTINCT FROM OLD.manual_carrier
            OR NEW.manual_tracking_number IS DISTINCT FROM OLD.manual_tracking_number
            OR NEW.manual_booking_reference IS DISTINCT FROM OLD.manual_booking_reference) THEN
      RAISE EXCEPTION 'This carrier booking has already been recorded';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('preparing','ready_for_pickup','collected') THEN
    RAISE EXCEPTION 'Vendors may only set preparing, ready_for_pickup or collected';
  END IF;

  RETURN NEW;
END;
$$;
