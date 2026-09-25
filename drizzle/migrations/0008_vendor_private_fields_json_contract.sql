CREATE OR REPLACE FUNCTION public.get_vendor_private_fields_v2(_vendor_id uuid)
RETURNS TABLE(id uuid, payment_details jsonb, warehouse_address jsonb)
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
    EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.id = _vendor_id
        AND v.user_id = auth.uid()
    )
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

REVOKE ALL ON FUNCTION public.get_vendor_private_fields_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendor_private_fields_v2(uuid) TO authenticated, service_role;