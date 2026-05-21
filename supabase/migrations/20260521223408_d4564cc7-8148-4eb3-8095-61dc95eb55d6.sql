
-- 1. Category commission rates
CREATE TABLE public.category_commission_rates (
  category_id uuid PRIMARY KEY REFERENCES public.categories(id) ON DELETE CASCADE,
  commission_pct numeric(5,2) NOT NULL CHECK (commission_pct >= 0 AND commission_pct <= 50),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.category_commission_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commission rates viewable by everyone"
  ON public.category_commission_rates FOR SELECT USING (true);

CREATE POLICY "Admins manage commission rates"
  ON public.category_commission_rates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Platform fee settings (single row, id=1)
CREATE TABLE public.platform_fee_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_commission_pct numeric(5,2) NOT NULL DEFAULT 12.00,
  payment_processing_pct numeric(5,2) NOT NULL DEFAULT 2.90,
  payment_processing_flat numeric(8,2) NOT NULL DEFAULT 0.30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fee settings viewable by everyone"
  ON public.platform_fee_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage fee settings"
  ON public.platform_fee_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.platform_fee_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3. Seed top-level category commissions
INSERT INTO public.category_commission_rates (category_id, commission_pct) VALUES
  ('a0000001-0000-0000-0000-000000000001', 8.00),   -- Electronics
  ('a0000001-0000-0000-0000-000000000006', 8.00),   -- Phones & Tablets
  ('a0000001-0000-0000-0000-000000000002', 15.00),  -- Fashion
  ('a0000001-0000-0000-0000-000000000004', 12.00),  -- Health & Beauty
  ('a0000001-0000-0000-0000-000000000003', 12.00),  -- Home & Garden
  ('a0000001-0000-0000-0000-000000000005', 12.00),  -- Sports & Fitness
  ('0aac50a2-1379-4d8a-8f86-4e998860a3b2', 10.00),  -- Automotive
  ('445211b0-daa2-42ba-830a-aa5a7c35d226', 15.00)   -- Books
ON CONFLICT (category_id) DO NOTHING;

-- 4. Snapshot columns on order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_fee_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS vendor_payout numeric(12,2);

-- 5. Helper: resolve top-level category id
CREATE OR REPLACE FUNCTION public.get_top_level_category(_category_id uuid)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _cur uuid := _category_id;
  _parent uuid;
  _depth int := 0;
BEGIN
  WHILE _cur IS NOT NULL AND _depth < 10 LOOP
    SELECT parent_id INTO _parent FROM public.categories WHERE id = _cur;
    IF _parent IS NULL THEN RETURN _cur; END IF;
    _cur := _parent;
    _depth := _depth + 1;
  END LOOP;
  RETURN _cur;
END;
$$;

-- 6. Trigger to compute fee snapshot
CREATE OR REPLACE FUNCTION public.compute_order_item_fees()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _cat uuid;
  _top uuid;
  _pct numeric(5,2);
  _line_total numeric(12,2);
  _settings public.platform_fee_settings%ROWTYPE;
  _proc_share numeric(12,2);
  _order_subtotal numeric(12,2);
BEGIN
  SELECT * INTO _settings FROM public.platform_fee_settings WHERE id = 1;

  SELECT category_id INTO _cat FROM public.products WHERE id = NEW.product_id;
  _top := public.get_top_level_category(_cat);

  SELECT commission_pct INTO _pct
  FROM public.category_commission_rates WHERE category_id = _top;

  IF _pct IS NULL THEN
    _pct := COALESCE(_settings.default_commission_pct, 12.00);
  END IF;

  _line_total := NEW.price * NEW.quantity;

  -- Pro-rated processing fee share for this line based on order subtotal
  SELECT COALESCE(SUM(price * quantity), 0) + _line_total
    INTO _order_subtotal
    FROM public.order_items
    WHERE order_id = NEW.order_id;

  IF _order_subtotal > 0 THEN
    _proc_share := ROUND(
      (_line_total / _order_subtotal) *
      (_order_subtotal * (COALESCE(_settings.payment_processing_pct, 2.90) / 100.0)
       + COALESCE(_settings.payment_processing_flat, 0.30)),
      2);
  ELSE
    _proc_share := 0;
  END IF;

  NEW.commission_pct := _pct;
  NEW.commission_amount := ROUND(_line_total * _pct / 100.0, 2);
  NEW.payment_fee_amount := _proc_share;
  NEW.vendor_payout := ROUND(_line_total - NEW.commission_amount - _proc_share, 2);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_order_item_fees ON public.order_items;
CREATE TRIGGER trg_compute_order_item_fees
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.compute_order_item_fees();
