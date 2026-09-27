-- DEVELOPMENT DRAFT. Immutable policy acceptances; version is server-selected.
CREATE OR REPLACE FUNCTION public.accept_seller_agreements(p_codes text[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
 r public.seller_country_requirements;
 code text; inserted_count integer:=0;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR a.status <> 'draft' THEN RAISE EXCEPTION 'No editable application'; END IF;
 SELECT * INTO r FROM public.seller_country_requirements
 WHERE country=a.country AND business_type=a.business_type
 AND stripe_connect_enabled=true AND reviewed_at IS NOT NULL
 ORDER BY reviewed_at DESC LIMIT 1;
 IF r.country IS NULL THEN RAISE EXCEPTION 'Country onboarding not enabled'; END IF;
 IF p_codes IS NULL OR cardinality(p_codes)=0 OR cardinality(p_codes)>6
 THEN RAISE EXCEPTION 'Invalid agreement selection'; END IF;
 FOREACH code IN ARRAY p_codes LOOP
  IF code NOT IN ('seller_terms','commission_payout','shipping_fulfillment',
  'returns_refunds','prohibited_products','product_authenticity')
  THEN RAISE EXCEPTION 'Unknown agreement'; END IF;
  INSERT INTO public.seller_agreement_acceptances
   (application_id,policy_code,policy_version,accepted_by)
  VALUES(a.id,code,r.rules_version,(SELECT auth.uid()))
  ON CONFLICT(application_id,policy_code,policy_version) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
 END LOOP;
 RETURN (SELECT count(*) FROM public.seller_agreement_acceptances
 WHERE application_id=a.id AND policy_version=r.rules_version)::integer;
END $$;
REVOKE ALL ON FUNCTION public.accept_seller_agreements(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_seller_agreements(text[]) TO authenticated;
-- The UI must display actual published policy documents and their versions.
