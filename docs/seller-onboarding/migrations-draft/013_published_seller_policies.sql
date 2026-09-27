-- DEVELOPMENT DRAFT: only reviewed, published policies may be accepted.
CREATE TABLE IF NOT EXISTS public.seller_policy_documents(
 policy_code text NOT NULL CHECK(policy_code IN (
 'seller_terms','commission_payout','shipping_fulfillment',
 'returns_refunds','prohibited_products','product_authenticity')),
 policy_version text NOT NULL,
 title text NOT NULL,
 document_url text NOT NULL CHECK(document_url ~ '^https://'),
 published_at timestamptz,
 PRIMARY KEY(policy_code,policy_version)
);
ALTER TABLE public.seller_policy_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_policies_published_read ON public.seller_policy_documents
 FOR SELECT TO authenticated USING(published_at IS NOT NULL);
-- No client insert/update/delete: publishing requires controlled admin process.
-- Deploy 005 first. Replace acceptance RPC to reject missing/unpublished documents.
CREATE OR REPLACE FUNCTION public.accept_seller_agreements(p_codes text[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
 r public.seller_country_requirements;
 code text;
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
 OR cardinality(p_codes)<>(SELECT count(DISTINCT x) FROM unnest(p_codes) AS t(x))
 THEN RAISE EXCEPTION 'Invalid agreement selection'; END IF;
 FOREACH code IN ARRAY p_codes LOOP
  IF NOT EXISTS(SELECT 1 FROM public.seller_policy_documents d
   WHERE d.policy_code=code AND d.policy_version=r.rules_version
   AND d.published_at IS NOT NULL)
  THEN RAISE EXCEPTION 'Required seller policy is not published: %',code; END IF;
  INSERT INTO public.seller_agreement_acceptances
   (application_id,policy_code,policy_version,accepted_by)
  VALUES(a.id,code,r.rules_version,(SELECT auth.uid()))
  ON CONFLICT(application_id,policy_code,policy_version) DO NOTHING;
 END LOOP;
 RETURN (SELECT count(*) FROM public.seller_agreement_acceptances
 WHERE application_id=a.id AND policy_version=r.rules_version)::integer;
END $$;
REVOKE ALL ON FUNCTION public.accept_seller_agreements(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_seller_agreements(text[]) TO authenticated;
