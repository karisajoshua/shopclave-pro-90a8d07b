
-- 1. Lock down notifications: remove the open INSERT policy.
-- Notifications are created server-side by SECURITY DEFINER triggers/functions
-- and by admins. Clients should never insert notifications directly.
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- 2. Restrict sensitive vendor columns from public exposure.
-- Anonymous visitors must not see payment details, phones, whatsapp or warehouse address.
-- Authenticated non-owners must not see payment details or warehouse address.
-- Phones/whatsapp remain readable by authenticated users (Jiji-style contact model).
REVOKE SELECT (payment_details, phone, phone2, whatsapp, warehouse_address)
  ON public.vendors FROM anon;
REVOKE SELECT (payment_details, warehouse_address)
  ON public.vendors FROM authenticated;

-- Owners + admins still need full access; service_role for edge functions.
GRANT SELECT (payment_details, warehouse_address) ON public.vendors TO service_role;

-- 3. SECURITY DEFINER RPC so authenticated buyers can read payment_details at
-- checkout (needed to display direct-vendor M-Pesa/bank info), while bypassing
-- the column revoke safely.
CREATE OR REPLACE FUNCTION public.get_vendor_payment_details(_vendor_ids uuid[])
RETURNS TABLE(id uuid, store_name text, payment_details jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.store_name, v.payment_details
  FROM public.vendors v
  WHERE v.id = ANY(_vendor_ids)
    AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_vendor_payment_details(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendor_payment_details(uuid[]) TO authenticated, service_role;

-- 4. Owner-scoped RPC for the vendor's own payment_details + warehouse_address
-- (used by VendorSettings and admin views).
CREATE OR REPLACE FUNCTION public.get_vendor_private_fields(_vendor_id uuid)
RETURNS TABLE(id uuid, payment_details jsonb, warehouse_address text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = _vendor_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
    SELECT v.id, v.payment_details, v.warehouse_address
    FROM public.vendors v
    WHERE v.id = _vendor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_vendor_private_fields(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendor_private_fields(uuid) TO authenticated, service_role;
