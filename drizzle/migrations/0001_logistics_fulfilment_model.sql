-- ============================================================
-- Barakaz logistics: quotes, shipments, tracking, returns
-- ============================================================

-- 1. Product shipping data ------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hs_code TEXT,
  ADD COLUMN IF NOT EXISTS customs_value_cad NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS international_shipping_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handling_time_days INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS is_physical BOOLEAN NOT NULL DEFAULT true;

-- 2. Shipping quotes (server-authoritative rate cache) --------
CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  rate_id TEXT,
  source TEXT NOT NULL DEFAULT 'shippo',           -- 'shippo' | 'estimate'
  provider TEXT NOT NULL,
  service TEXT NOT NULL,
  amount_original NUMERIC(12,2) NOT NULL,
  currency_original TEXT NOT NULL,
  fx_rate_to_cad NUMERIC(18,8) NOT NULL DEFAULT 1,
  amount_cad NUMERIC(12,2) NOT NULL,
  estimated_days INTEGER,
  duration_terms TEXT,
  is_estimate BOOLEAN NOT NULL DEFAULT false,
  address_fingerprint TEXT NOT NULL,
  items_fingerprint TEXT NOT NULL,
  parcel JSONB NOT NULL DEFAULT '{}'::jsonb,
  consumed_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_user ON public.shipping_quotes(user_id, created_at DESC);

GRANT SELECT ON public.shipping_quotes TO authenticated;
GRANT ALL ON public.shipping_quotes TO service_role;
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own shipping quotes" ON public.shipping_quotes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all shipping quotes" ON public.shipping_quotes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Shipments -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.shipping_quotes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'preparing',
  carrier TEXT,
  service TEXT,
  rate_id TEXT,
  is_estimate BOOLEAN NOT NULL DEFAULT false,
  shippo_transaction_id TEXT,
  shippo_shipment_id TEXT,
  label_url TEXT,
  commercial_invoice_url TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipping_amount_original NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_currency_original TEXT NOT NULL DEFAULT 'CAD',
  fx_rate_to_cad NUMERIC(18,8) NOT NULL DEFAULT 1,
  shipping_amount_cad NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_delivery TIMESTAMPTZ,
  label_error TEXT,
  label_purchased_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shipment_order_vendor ON public.shipments(order_id, vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shipment_shippo_txn ON public.shipments(shippo_transaction_id) WHERE shippo_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.shipments(tracking_number) WHERE tracking_number IS NOT NULL;

CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.shipments TO authenticated;
GRANT UPDATE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers read own shipments" ON public.shipments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Vendors read own shipments" ON public.shipments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Admins read all shipments" ON public.shipments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
-- Vendors may advance workflow status only; money/label columns are service-role only
CREATE POLICY "Vendors update own shipment status" ON public.shipments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Admins update all shipments" ON public.shipments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Guard: non-admins may only change workflow status fields
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
     OR NEW.shippo_transaction_id IS DISTINCT FROM OLD.shippo_transaction_id
     OR NEW.label_url IS DISTINCT FROM OLD.label_url
     OR NEW.tracking_number IS DISTINCT FROM OLD.tracking_number
     OR NEW.rate_id IS DISTINCT FROM OLD.rate_id
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
CREATE TRIGGER trg_guard_shipment_update BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.guard_shipment_update();

-- 4. Shipment items -------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shipment_item ON public.shipment_items(shipment_id, order_item_id);

GRANT SELECT ON public.shipment_items TO authenticated;
GRANT ALL ON public.shipment_items TO service_role;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read shipment items" ON public.shipment_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    LEFT JOIN public.orders o ON o.id = s.order_id
    LEFT JOIN public.vendors v ON v.id = s.vendor_id
    WHERE s.id = shipment_id
      AND (o.user_id = auth.uid() OR v.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin'::public.app_role))
  ));

-- 5. Tracking events ------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  provider_status TEXT,
  description TEXT,
  location TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_event_key TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tracking_event_key
  ON public.tracking_events(shipment_id, provider_event_key) WHERE provider_event_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment ON public.tracking_events(shipment_id, occurred_at DESC);

GRANT SELECT ON public.tracking_events TO authenticated;
GRANT ALL ON public.tracking_events TO service_role;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read tracking events" ON public.tracking_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    LEFT JOIN public.orders o ON o.id = s.order_id
    LEFT JOIN public.vendors v ON v.id = s.vendor_id
    WHERE s.id = shipment_id
      AND (o.user_id = auth.uid() OR v.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin'::public.app_role))
  ));

-- 6. Returns ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested',
  reason TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  vendor_notes TEXT,
  admin_notes TEXT,
  return_label_url TEXT,
  return_tracking_number TEXT,
  return_carrier TEXT,
  refund_amount_cad NUMERIC(12,2),
  refund_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);

CREATE TRIGGER trg_return_requests_updated_at BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers manage own returns" ON public.return_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Buyers create own returns" ON public.return_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Vendors read their returns" ON public.return_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Vendors update their returns" ON public.return_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Admins manage all returns" ON public.return_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7. Webhook idempotency ---------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_webhook_event ON public.webhook_events(provider, event_key);
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

COMMENT ON COLUMN public.order_items.shipping_rate_id IS 'DEPRECATED: shipment lifecycle now lives in public.shipments';
COMMENT ON COLUMN public.order_items.label_url IS 'DEPRECATED: replaced by public.shipments.label_url';
COMMENT ON COLUMN public.order_items.shippo_transaction_id IS 'DEPRECATED: replaced by public.shipments.shippo_transaction_id';