-- DEVELOPMENT DRAFT. Apply only after schema/security review.
-- Country eligibility is configured only after Stripe Connect availability and
-- compliance checks; no default countries are silently enabled.
CREATE TABLE IF NOT EXISTS public.seller_country_requirements (
 country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
 business_type text NOT NULL CHECK (business_type IN ('individual','sole_proprietor','company')),
 rules_version text NOT NULL,
 stripe_connect_enabled boolean NOT NULL DEFAULT false,
 required_documents text[] NOT NULL DEFAULT '{}'::text[],
 required_fields text[] NOT NULL DEFAULT '{}'::text[],
 reviewed_at timestamptz,
 PRIMARY KEY(country,business_type,rules_version)
);
ALTER TABLE public.seller_country_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_country_requirements_read ON public.seller_country_requirements
 FOR SELECT TO authenticated USING(true);
-- No authenticated write policy: country rules must be administratively configured.
ALTER TABLE public.seller_applications
 ADD COLUMN IF NOT EXISTS rules_version text,
 ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'not_started'
 CHECK(kyc_status IN ('not_started','pending','action_required','verified','rejected'));
CREATE OR REPLACE FUNCTION public.submit_seller_application()
 RETURNS public.seller_applications
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
 r public.seller_country_requirements;
 code text;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR a.status <> 'draft' THEN RAISE EXCEPTION 'No editable application'; END IF;
 SELECT * INTO r FROM public.seller_country_requirements
 WHERE country=a.country AND business_type=a.business_type AND stripe_connect_enabled=true
 AND reviewed_at IS NOT NULL ORDER BY reviewed_at DESC LIMIT 1;
 IF r.country IS NULL THEN RAISE EXCEPTION 'Seller onboarding is not yet supported for this country and business type'; END IF;
 IF nullif(btrim(a.business_info->>'full_name'),'') IS NULL
 OR nullif(btrim(a.business_info->>'phone'),'') IS NULL
 OR nullif(btrim(a.business_info->>'legal_name'),'') IS NULL
 OR nullif(btrim(a.business_info->>'address'),'') IS NULL
 OR nullif(btrim(a.business_info->>'category'),'') IS NULL
 OR nullif(btrim(a.store_info->>'store_name'),'') IS NULL
 OR nullif(btrim(a.store_info->>'store_description'),'') IS NULL
 OR nullif(btrim(a.store_info->>'ship_from'),'') IS NULL
 OR nullif(btrim(a.store_info->>'return_address'),'') IS NULL
 THEN RAISE EXCEPTION 'Required business or store information is missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.seller_payout_accounts p
 WHERE p.application_id=a.id AND p.provider='stripe'
 AND nullif(p.provider_account_id,'') IS NOT NULL AND p.country=a.country)
 THEN RAISE EXCEPTION 'Stripe Connect onboarding must be started before submission'; END IF;
 FOREACH code IN ARRAY r.required_fields LOOP
  IF nullif(btrim(coalesce(a.business_info->>code,a.store_info->>code,'')),'') IS NULL
  THEN RAISE EXCEPTION 'Missing required country field: %',code; END IF;
 END LOOP;
 FOREACH code IN ARRAY r.required_documents LOOP
  IF NOT EXISTS (SELECT 1 FROM public.seller_verification_documents d
   WHERE d.application_id=a.id AND d.requirement_code=code
   AND d.verification_status IN ('pending','verified'))
  THEN RAISE EXCEPTION 'Missing required verification document: %',code; END IF;
 END LOOP;
 FOREACH code IN ARRAY ARRAY['seller_terms','commission_payout','shipping_fulfillment',
 'returns_refunds','prohibited_products','product_authenticity'] LOOP
  IF NOT EXISTS (SELECT 1 FROM public.seller_agreement_acceptances t
   WHERE t.application_id=a.id AND t.policy_code=code
   AND t.policy_version=r.rules_version AND t.accepted_by=(SELECT auth.uid()))
  THEN RAISE EXCEPTION 'Required agreement not accepted: %',code; END IF;
 END LOOP;
 UPDATE public.seller_applications SET status='submitted',rules_version=r.rules_version,
 submitted_at=now(),updated_at=now() WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status)
 VALUES(a.id,(SELECT auth.uid()),'draft','submitted');
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.submit_seller_application() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_seller_application() TO authenticated;
