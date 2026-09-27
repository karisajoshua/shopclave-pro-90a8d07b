-- DRAFT ONLY. NOT APPLIED. Must be reviewed alongside 001_international_customs.sql.
-- Called exclusively from a trusted server after the order and cart have been
-- recomputed; does not authorize or initiate payment.
-- One atomic claim for the entire multivendor basket. Any failure rolls back.
CREATE OR REPLACE FUNCTION public.claim_international_quotes(
  p_order_id uuid,
  p_user_id uuid,
  p_destination text,
  p_address_fingerprint text,
  p_items_fingerprint text,
  p_vendor_parcels jsonb,
  p_quote_ids uuid[],
  p_dap_acknowledged boolean
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  q public.international_quotes%ROWTYPE;
  total_cad numeric := 0;
  claimed_count integer := 0;
  vendor_count integer;
  order_owner uuid;
  order_status text;
  actual_vendor_count integer;
BEGIN
  IF p_order_id IS NULL OR p_user_id IS NULL OR
     p_destination !~ '^[A-Z]{2}$' OR
     NULLIF(p_address_fingerprint, '') IS NULL OR
     NULLIF(p_items_fingerprint, '') IS NULL OR
     p_vendor_parcels IS NULL OR jsonb_typeof(p_vendor_parcels) <> 'object' OR
     p_quote_ids IS NULL OR cardinality(p_quote_ids) = 0 OR
     EXISTS (SELECT 1 FROM unnest(p_quote_ids) x WHERE x IS NULL) OR
     cardinality(p_quote_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_quote_ids) x)
  THEN RAISE EXCEPTION 'Invalid international quote selection'; END IF;

  -- Bind the claim to an actual pending order owned by the authenticated shopper.
  -- The trusted caller must create that order in the SAME transaction as this call.
  SELECT o.user_id, o.status INTO order_owner, order_status
  FROM public.orders o WHERE o.id = p_order_id FOR UPDATE;
  IF order_owner IS DISTINCT FROM p_user_id OR order_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'International order ownership or state invalid';
  END IF;

  SELECT count(*) INTO vendor_count FROM jsonb_object_keys(p_vendor_parcels);
  IF vendor_count <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION 'Vendor and quote counts differ';
  END IF;

  -- The selected vendors must match the persisted order items, not merely
  -- the caller-provided vendor map. The transaction must insert order_items
  -- before claiming quotes; this function cannot repair partial orders.
  SELECT count(DISTINCT oi.vendor_id) INTO actual_vendor_count
  FROM public.order_items oi WHERE oi.order_id = p_order_id;
  IF actual_vendor_count <> vendor_count OR EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = p_order_id
      AND NOT (p_vendor_parcels ? oi.vendor_id::text)
  ) THEN RAISE EXCEPTION 'International quote vendors differ from order items'; END IF;

  -- Every provided vendor must have a nonempty fingerprint. Reject unrelated
  -- vendor keys as well as missing quote IDs before any quote is consumed.
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(p_vendor_parcels) AS e(vendor_id, fingerprint)
    WHERE NULLIF(e.fingerprint, '') IS NULL
  ) THEN RAISE EXCEPTION 'Missing vendor parcel fingerprint'; END IF;

  -- Sorted row locking makes concurrent attempts deterministic.
  FOR q IN
    SELECT * FROM public.international_quotes
    WHERE id = ANY(p_quote_ids)
    ORDER BY id FOR UPDATE
  LOOP
    IF q.user_id <> p_user_id OR q.destination_country <> p_destination OR
       q.address_fingerprint <> p_address_fingerprint OR
       q.items_fingerprint <> p_items_fingerprint OR
       NULLIF(p_vendor_parcels ->> q.vendor_id::text, '') IS NULL OR
       q.parcel_fingerprint <> p_vendor_parcels ->> q.vendor_id::text OR
       q.consumed_order_id IS NOT NULL OR q.expires_at <= now() OR
       q.verified IS NOT TRUE OR q.source NOT IN ('shippo','dhl_express','zonos') OR
       (q.mode = 'DAP' AND p_dap_acknowledged IS NOT TRUE) OR
       (q.mode = 'DDP' AND (q.duties_cad IS NULL OR q.import_tax_cad IS NULL))
    THEN RAISE EXCEPTION 'International quote validation failed'; END IF;

    IF EXISTS (
      SELECT 1 FROM public.international_quotes iq
      WHERE iq.id = ANY(p_quote_ids) AND iq.id <> q.id AND iq.vendor_id = q.vendor_id
    ) THEN RAISE EXCEPTION 'Duplicate vendor quote'; END IF;

    total_cad := total_cad + q.shipping_cad + coalesce(q.customs_fee_cad,0) +
      CASE WHEN q.mode = 'DDP' THEN coalesce(q.duties_cad,0) + coalesce(q.import_tax_cad,0) ELSE 0 END;
    UPDATE public.international_quotes SET consumed_order_id = p_order_id WHERE id = q.id;
    claimed_count := claimed_count + 1;
  END LOOP;

  IF claimed_count <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION 'Missing international quote';
  END IF;
  RETURN round(total_cad,2);
END;
$$;
-- Never expose this function to authenticated clients.
REVOKE ALL ON FUNCTION public.claim_international_quotes(uuid,uuid,text,text,text,jsonb,uuid[],boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_international_quotes(uuid,uuid,text,text,text,jsonb,uuid[],boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_international_quotes(uuid,uuid,text,text,text,jsonb,uuid[],boolean) TO service_role;
