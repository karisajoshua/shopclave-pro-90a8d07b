CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'mpesa',
  payment_details jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own withdrawals" ON public.withdrawal_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vendors WHERE vendors.id = withdrawal_requests.vendor_id AND vendors.user_id = auth.uid())
  );

CREATE POLICY "Vendors can create withdrawals" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors WHERE vendors.id = withdrawal_requests.vendor_id AND vendors.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update withdrawals" ON public.withdrawal_requests
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;