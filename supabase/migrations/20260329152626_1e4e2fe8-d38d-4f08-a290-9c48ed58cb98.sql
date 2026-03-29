
-- Drop the existing permissive vendor self-update policy
DROP POLICY IF EXISTS "Vendors can update own store" ON public.vendors;

-- Recreate with WITH CHECK that prevents vendors from changing status or commission_rate
CREATE POLICY "Vendors can update own store"
ON public.vendors
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = (SELECT v.status FROM public.vendors v WHERE v.id = vendors.id)
  AND commission_rate = (SELECT v.commission_rate FROM public.vendors v WHERE v.id = vendors.id)
);
