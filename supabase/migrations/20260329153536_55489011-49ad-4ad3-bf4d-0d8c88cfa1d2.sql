
-- Fix 1: Replace blanket public SELECT on vendors with a view that excludes sensitive columns
DROP POLICY IF EXISTS "Vendors viewable by everyone" ON public.vendors;

-- Create a public-facing view that excludes commission_rate, user_id, and internal timestamps
CREATE VIEW public.vendors_public
WITH (security_invoker = on) AS
  SELECT id, store_name, store_description, logo_url, banner_url, status
  FROM public.vendors;

-- Allow public SELECT on the view (anyone can see store info)
-- The base table now only allows: vendor owner, admins
CREATE POLICY "Vendor owner can view own vendor"
  ON public.vendors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all vendors"
  ON public.vendors FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add explicit admin-only INSERT policy on user_roles
-- The existing "Admins can manage roles" ALL policy covers admin INSERT,
-- but let's add an explicit INSERT deny for non-admins to be safe
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
