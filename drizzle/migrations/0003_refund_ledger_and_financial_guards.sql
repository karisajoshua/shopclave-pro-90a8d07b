-- 1. Refunded amount tracking on order lines (additive, defaulted)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount_provider numeric(14,2) NOT NULL DEFAULT 0;

-- 2. Payment refunds ledger (one row per return request; idempotency anchor)
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id uuid NOT NULL UNIQUE REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_item_id uuid REFERENCES public.order_items(id),
  paystack_reference text NOT NULL,
  provider_refund_id text,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  provider_amount numeric(14,2),
  provider_currency text,
  fx_rate_used numeric(18,8),
  status text NOT NULL DEFAULT 'processing',
  failure_reason text,
  provider_payload jsonb,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_refunds_status_chk
    CHECK (status IN ('processing','pending','processed','failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_refund_provider_id
  ON public.payment_refunds (provider_refund_id) WHERE provider_refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_refunds_order ON public.payment_refunds (order_id);

GRANT SELECT ON public.payment_refunds TO authenticated;
GRANT ALL ON public.payment_refunds TO service_role;

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read refunds" ON public.payment_refunds
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Buyers read own refunds" ON public.payment_refunds
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = payment_refunds.order_id AND o.user_id = auth.uid()));

CREATE TRIGGER trg_payment_refunds_updated_at
  BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Ledger idempotency: one sale/refund entry per order item per entry type
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vendor_ledger_item_entry
  ON public.vendor_ledger (order_item_id, entry_type) WHERE order_item_id IS NOT NULL;

-- 4. Vendors must not touch financial columns on their order lines
CREATE OR REPLACE FUNCTION public.guard_order_item_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (no auth.uid()) and admins keep full control.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.price IS DISTINCT FROM OLD.price
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.payment_fee_amount IS DISTINCT FROM OLD.payment_fee_amount
     OR NEW.vendor_payout IS DISTINCT FROM OLD.vendor_payout
     OR NEW.refunded_amount IS DISTINCT FROM OLD.refunded_amount
     OR NEW.refunded_amount_provider IS DISTINCT FROM OLD.refunded_amount_provider
     OR NEW.shipping_amount IS DISTINCT FROM OLD.shipping_amount
     OR NEW.shipping_rate_id IS DISTINCT FROM OLD.shipping_rate_id
     OR NEW.label_url IS DISTINCT FROM OLD.label_url
     OR NEW.shippo_transaction_id IS DISTINCT FROM OLD.shippo_transaction_id
     OR NEW.stripe_transfer_id IS DISTINCT FROM OLD.stripe_transfer_id
     OR NEW.stripe_destination_account IS DISTINCT FROM OLD.stripe_destination_account
     OR NEW.paystack_split_code IS DISTINCT FROM OLD.paystack_split_code
     OR NEW.paystack_subaccount_code IS DISTINCT FROM OLD.paystack_subaccount_code
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
    RAISE EXCEPTION 'Only fulfilment status may be changed on an order item';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_item_update ON public.order_items;
CREATE TRIGGER trg_guard_order_item_update
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_item_update();

-- 5. Vendors must not set refund money or financial return states
CREATE OR REPLACE FUNCTION public.guard_return_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.refund_amount_cad IS DISTINCT FROM OLD.refund_amount_cad
     OR NEW.refund_reference IS DISTINCT FROM OLD.refund_reference
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.order_item_id IS DISTINCT FROM OLD.order_item_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
     OR NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    RAISE EXCEPTION 'Refund and ownership fields are managed by Barakaz';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('reviewed','approved','rejected','received','inspected') THEN
    RAISE EXCEPTION 'Vendors may not set return status %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_return_request_update ON public.return_requests;
CREATE TRIGGER trg_guard_return_request_update
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_return_request_update();

-- 6. Vendors must not switch fulfilment mode; manual booking fields stay vendor-writable
CREATE OR REPLACE FUNCTION public.guard_shipment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.shipping_amount_cad IS DISTINCT FROM OLD.shipping_amount_cad
     OR NEW.shipping_amount_original IS DISTINCT FROM OLD.shipping_amount_original
     OR NEW.shipping_currency_original IS DISTINCT FROM OLD.shipping_currency_original
     OR NEW.fx_rate_to_cad IS DISTINCT FROM OLD.fx_rate_to_cad
     OR NEW.shippo_transaction_id IS DISTINCT FROM OLD.shippo_transaction_id
     OR NEW.shippo_shipment_id IS DISTINCT FROM OLD.shippo_shipment_id
     OR NEW.label_url IS DISTINCT FROM OLD.label_url
     OR NEW.commercial_invoice_url IS DISTINCT FROM OLD.commercial_invoice_url
     OR NEW.tracking_number IS DISTINCT FROM OLD.tracking_number
     OR NEW.rate_id IS DISTINCT FROM OLD.rate_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
     OR NEW.is_estimate IS DISTINCT FROM OLD.is_estimate
     OR NEW.fulfilment_mode IS DISTINCT FROM OLD.fulfilment_mode
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
    RAISE EXCEPTION 'Only shipment workflow status may be changed here';
  END IF;
  IF NEW.status NOT IN ('preparing','ready_for_pickup','collected') THEN
    RAISE EXCEPTION 'Vendors may only set preparing, ready_for_pickup or collected';
  END IF;
  RETURN NEW;
END;
$$;
