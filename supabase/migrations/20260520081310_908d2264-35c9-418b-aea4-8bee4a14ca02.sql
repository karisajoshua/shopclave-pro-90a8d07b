
-- ============= Marketplace pivot: payments, payouts, shipping =============

-- 1) Vendor Stripe Connect accounts
CREATE TABLE public.vendor_stripe_accounts (
  vendor_id UUID PRIMARY KEY,
  stripe_account_id TEXT NOT NULL UNIQUE,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  country TEXT,
  default_currency TEXT,
  requirements_due JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_stripe_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor reads own stripe account" ON public.vendor_stripe_accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Admin reads all stripe accounts" ON public.vendor_stripe_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_vsa_updated BEFORE UPDATE ON public.vendor_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Vendor balances (denormalized cache of ledger)
CREATE TABLE public.vendor_balances (
  vendor_id UUID PRIMARY KEY,
  available_amount NUMERIC NOT NULL DEFAULT 0,
  pending_amount NUMERIC NOT NULL DEFAULT 0,
  lifetime_sales NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor reads own balance" ON public.vendor_balances FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Admin reads all balances" ON public.vendor_balances FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Vendor ledger (source of truth)
CREATE TABLE public.vendor_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  order_item_id UUID,
  withdrawal_id UUID,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('sale','commission','refund','withdrawal','adjustment','shipping_cost')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('pending','available','reversed')),
  stripe_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendor_ledger_vendor ON public.vendor_ledger(vendor_id, created_at DESC);
ALTER TABLE public.vendor_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor reads own ledger" ON public.vendor_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Admin reads all ledger" ON public.vendor_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','canceled')),
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_withdrawals_vendor ON public.withdrawals(vendor_id, requested_at DESC);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor reads own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()));
CREATE POLICY "Admin reads all withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5) Products: shipping dimensions
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_g INTEGER,
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS ships_from_country TEXT DEFAULT 'US';

-- 6) Vendors: warehouse address + currency
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS warehouse_address JSONB,
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'usd';

-- 7) Orders: currency, shipping totals, Stripe references
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS shipping_total NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- 8) Order items: shipping per vendor
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS shipping_rate_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS label_url TEXT,
  ADD COLUMN IF NOT EXISTS shippo_transaction_id TEXT;

-- 9) Balance recompute helper (service role / webhook use)
CREATE OR REPLACE FUNCTION public.recompute_vendor_balance(_vendor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _avail NUMERIC;
  _pend NUMERIC;
  _life NUMERIC;
  _curr TEXT;
BEGIN
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'available'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
    COALESCE(SUM(amount) FILTER (WHERE entry_type = 'sale'), 0),
    COALESCE(MAX(currency), 'usd')
  INTO _avail, _pend, _life, _curr
  FROM public.vendor_ledger
  WHERE vendor_id = _vendor_id;

  INSERT INTO public.vendor_balances (vendor_id, available_amount, pending_amount, lifetime_sales, currency, updated_at)
  VALUES (_vendor_id, _avail, _pend, _life, _curr, now())
  ON CONFLICT (vendor_id) DO UPDATE SET
    available_amount = EXCLUDED.available_amount,
    pending_amount = EXCLUDED.pending_amount,
    lifetime_sales = EXCLUDED.lifetime_sales,
    currency = EXCLUDED.currency,
    updated_at = now();
END;
$$;

-- 10) Trigger to keep balance in sync
CREATE OR REPLACE FUNCTION public.tg_recompute_balance_on_ledger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_vendor_balance(COALESCE(NEW.vendor_id, OLD.vendor_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_ledger_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_ledger
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_balance_on_ledger();
