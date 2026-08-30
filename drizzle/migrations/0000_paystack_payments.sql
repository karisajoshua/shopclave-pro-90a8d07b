-- Vendor Paystack subaccounts (payout destinations)
CREATE TABLE public.vendor_paystack_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE CASCADE,
  subaccount_code text NOT NULL,
  business_name text,
  bank_code text NOT NULL,
  bank_name text,
  account_number_last4 text,
  account_name text,
  currency text NOT NULL DEFAULT 'NGN',
  country text,
  percentage_charge numeric(5,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_paystack_accounts TO authenticated;
GRANT ALL ON public.vendor_paystack_accounts TO service_role;

ALTER TABLE public.vendor_paystack_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view their own paystack account"
ON public.vendor_paystack_accounts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage paystack accounts"
ON public.vendor_paystack_accounts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_vendor_paystack_accounts_updated_at
BEFORE UPDATE ON public.vendor_paystack_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order-level Paystack fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paystack_reference text,
  ADD COLUMN IF NOT EXISTS charged_currency text,
  ADD COLUMN IF NOT EXISTS charged_amount numeric(14,2);

CREATE UNIQUE INDEX IF NOT EXISTS orders_paystack_reference_key
  ON public.orders (paystack_reference) WHERE paystack_reference IS NOT NULL;

-- Item-level split traceability
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS paystack_split_code text,
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code text;