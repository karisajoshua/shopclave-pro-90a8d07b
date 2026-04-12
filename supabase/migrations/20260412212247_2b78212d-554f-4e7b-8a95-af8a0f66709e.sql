
-- Add vendor contact fields
ALTER TABLE public.vendors
  ADD COLUMN phone text,
  ADD COLUMN phone2 text,
  ADD COLUMN website text,
  ADD COLUMN whatsapp text;

-- Create vendor subscriptions table
CREATE TABLE public.vendor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'free',
  max_listings integer NOT NULL DEFAULT 5,
  price numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own subscriptions"
ON public.vendor_subscriptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.vendors WHERE vendors.id = vendor_subscriptions.vendor_id AND vendors.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all subscriptions"
ON public.vendor_subscriptions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create vendor analytics table
CREATE TABLE public.vendor_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
ON public.vendor_analytics FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Vendors can view own analytics"
ON public.vendor_analytics FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.vendors WHERE vendors.id = vendor_analytics.vendor_id AND vendors.user_id = auth.uid()
));

CREATE POLICY "Admins can view all analytics"
ON public.vendor_analytics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
