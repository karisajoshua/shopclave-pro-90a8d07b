ALTER TABLE public.seller_country_requirements
 ADD COLUMN conditional_requirements jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.seller_country_requirements
 ADD CONSTRAINT seller_country_requirements_conditional_is_array CHECK (jsonb_typeof(conditional_requirements)='array');

CREATE OR REPLACE FUNCTION public.seller_conditional_requirements(p_business_info jsonb, p_rules jsonb)
 RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $function$
DECLARE item jsonb; k text; fields jsonb := '[]'::jsonb; docs jsonb := '[]'::jsonb;
BEGIN
 IF p_rules IS NULL OR jsonb_typeof(p_rules) <> 'array' THEN RAISE EXCEPTION 'Conditional requirements must be an array'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rules) LOOP
  IF jsonb_typeof(item) <> 'object' THEN RAISE EXCEPTION 'Invalid conditional seller requirement'; END IF;
  FOR k IN SELECT jsonb_object_keys(item) LOOP
   IF k NOT IN ('when_field','equals','required_fields','required_documents') THEN RAISE EXCEPTION 'Unknown conditional requirement key: %',k; END IF;
  END LOOP;
  IF item->>'when_field' IS DISTINCT FROM 'is_business_registered' THEN RAISE EXCEPTION 'Unsupported conditional field: %',coalesce(item->>'when_field','(missing)'); END IF;
  IF jsonb_typeof(item->'equals') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Conditional "equals" must be a boolean'; END IF;
  IF item ? 'required_fields' AND jsonb_typeof(item->'required_fields') <> 'array' THEN RAISE EXCEPTION 'required_fields must be an array'; END IF;
  IF item ? 'required_documents' AND jsonb_typeof(item->'required_documents') <> 'array' THEN RAISE EXCEPTION 'required_documents must be an array'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(item->'required_fields','[]'::jsonb)||coalesce(item->'required_documents','[]'::jsonb)) e WHERE jsonb_typeof(e.value)<>'string') THEN RAISE EXCEPTION 'Requirement codes must be strings'; END IF;
  IF p_business_info IS NULL OR jsonb_typeof(p_business_info->'is_business_registered') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Business registration status must be answered'; END IF;
  IF (p_business_info->'is_business_registered') = (item->'equals') THEN
   fields := fields || coalesce(item->'required_fields','[]'::jsonb);
   docs := docs || coalesce(item->'required_documents','[]'::jsonb);
  END IF;
 END LOOP;
 RETURN jsonb_build_object('required_fields',fields,'required_documents',docs);
END $function$;
REVOKE ALL ON FUNCTION public.seller_conditional_requirements(jsonb,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_seller_application()
 RETURNS seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE a public.seller_applications; r public.seller_country_requirements; code text; previous_status text; cond jsonb; eff_fields text[]; eff_docs text[];
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('draft','more_information_required') THEN RAISE EXCEPTION 'No editable application'; END IF;
 SELECT * INTO r FROM public.seller_country_requirements WHERE country=a.country AND business_type=a.business_type AND stripe_connect_enabled=true AND reviewed_at IS NOT NULL ORDER BY reviewed_at DESC LIMIT 1;
 IF r.country IS NULL THEN RAISE EXCEPTION 'Applications are not yet open for this country and business type'; END IF;
 IF nullif(btrim(a.business_info->>'full_name'),'') IS NULL OR nullif(btrim(a.business_info->>'phone'),'') IS NULL OR nullif(btrim(a.business_info->>'legal_name'),'') IS NULL OR nullif(btrim(a.business_info->>'address'),'') IS NULL OR nullif(btrim(a.business_info->>'category'),'') IS NULL OR nullif(btrim(a.store_info->>'store_name'),'') IS NULL OR nullif(btrim(a.store_info->>'store_description'),'') IS NULL OR nullif(btrim(a.store_info->>'logo_url'),'') IS NULL OR nullif(btrim(a.store_info->>'product_categories'),'') IS NULL OR nullif(btrim(a.store_info->>'ship_from'),'') IS NULL OR nullif(btrim(a.store_info->>'return_address'),'') IS NULL THEN RAISE EXCEPTION 'Required account, business, or store information is missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.seller_payout_accounts p WHERE p.application_id=a.id AND p.provider='stripe' AND nullif(p.provider_account_id,'') IS NOT NULL AND p.country=a.country AND p.verification_status NOT IN ('disabled','restricted')) THEN RAISE EXCEPTION 'Payout setup must be started before submission'; END IF;
 cond := public.seller_conditional_requirements(a.business_info, r.conditional_requirements);
 eff_fields := ARRAY(SELECT DISTINCT x FROM unnest(r.required_fields || ARRAY(SELECT jsonb_array_elements_text(cond->'required_fields'))) x);
 eff_docs := ARRAY(SELECT DISTINCT x FROM unnest(r.required_documents || ARRAY(SELECT jsonb_array_elements_text(cond->'required_documents'))) x);
 FOREACH code IN ARRAY eff_fields LOOP IF nullif(btrim(coalesce(a.business_info->>code,a.store_info->>code,'')),'') IS NULL THEN RAISE EXCEPTION 'Missing required country field: %',code; END IF; END LOOP;
 FOREACH code IN ARRAY eff_docs LOOP IF NOT EXISTS (SELECT 1 FROM public.seller_verification_documents d WHERE d.application_id=a.id AND d.requirement_code=code AND d.verification_status IN ('pending','verified')) THEN RAISE EXCEPTION 'Missing required verification document: %',code; END IF; END LOOP;
 FOREACH code IN ARRAY ARRAY['seller_terms','commission_payout','shipping_fulfillment','returns_refunds','prohibited_products','product_authenticity'] LOOP IF NOT EXISTS (SELECT 1 FROM public.seller_agreement_acceptances t WHERE t.application_id=a.id AND t.policy_code=code AND t.policy_version=r.rules_version AND t.accepted_by=(SELECT auth.uid())) THEN RAISE EXCEPTION 'Required agreement not accepted: %',code; END IF; END LOOP;
 previous_status:=a.status;
 UPDATE public.seller_applications SET status='submitted',rules_version=r.rules_version,current_step=7,submitted_at=now(),reviewed_at=NULL,reviewed_by=NULL,review_reason=NULL,updated_at=now() WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status) VALUES(a.id,(SELECT auth.uid()),previous_status,'submitted');
 RETURN a;
END $function$;
REVOKE ALL ON FUNCTION public.submit_seller_application() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_seller_application() TO authenticated;

CREATE OR REPLACE FUNCTION public.record_seller_kyc_review(p_application_id uuid, p_result text, p_reason text)
 RETURNS seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE a public.seller_applications; previous_kyc text; r public.seller_country_requirements; cond jsonb; eff_docs text[];
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.has_role((SELECT auth.uid()),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_result NOT IN ('verified','action_required','rejected') OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Documented verification decision required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=p_application_id FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'Application not ready for KYC review'; END IF;
 IF p_result='verified' THEN
  SELECT * INTO r FROM public.seller_country_requirements WHERE country=a.country AND business_type=a.business_type AND rules_version=a.rules_version AND stripe_connect_enabled=true AND reviewed_at IS NOT NULL;
  IF r.country IS NULL THEN RAISE EXCEPTION 'Approved country rules required'; END IF;
  cond := public.seller_conditional_requirements(a.business_info, r.conditional_requirements);
  eff_docs := ARRAY(SELECT DISTINCT x FROM unnest(r.required_documents || ARRAY(SELECT jsonb_array_elements_text(cond->'required_documents'))) x);
  IF cardinality(eff_docs) > 0 THEN
   IF EXISTS (SELECT 1 FROM unnest(eff_docs) req(code) WHERE NOT EXISTS (SELECT 1 FROM public.seller_verification_documents d WHERE d.application_id=a.id AND d.requirement_code=req.code AND d.verification_status='verified')) THEN RAISE EXCEPTION 'Required documents not independently verified'; END IF;
  ELSE
   IF NOT EXISTS (SELECT 1 FROM public.seller_payout_accounts p WHERE p.application_id=a.id AND p.provider='stripe' AND p.verification_status='verified' AND p.payouts_enabled=true AND nullif(btrim(p.provider_account_id),'') IS NOT NULL AND p.last_webhook_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified Stripe payout account required as identity evidence'; END IF;
  END IF;
 END IF;
 previous_kyc:=a.kyc_status;
 UPDATE public.seller_applications SET kyc_status=p_result,reviewed_by=(SELECT auth.uid()),review_reason=left(btrim(p_reason),500),reviewed_at=now(),updated_at=now() WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status,reason) VALUES(a.id,(SELECT auth.uid()),'kyc:'||coalesce(previous_kyc,'unknown'),'kyc:'||p_result,left(p_reason,500));
 RETURN a;
END $function$;
REVOKE ALL ON FUNCTION public.record_seller_kyc_review(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_seller_kyc_review(uuid,text,text) TO authenticated;

UPDATE public.seller_country_requirements SET required_fields='{}', required_documents='{}', conditional_requirements='[]'::jsonb
 WHERE country='CA' AND rules_version='ca-v1' AND business_type='individual' AND stripe_connect_enabled=false AND reviewed_at IS NULL;
UPDATE public.seller_country_requirements SET required_fields='{}', required_documents='{}', conditional_requirements='[{"when_field":"is_business_registered","equals":true,"required_fields":["registration_number"],"required_documents":["business_registration"]}]'::jsonb
 WHERE country='CA' AND rules_version='ca-v1' AND business_type='sole_proprietor' AND stripe_connect_enabled=false AND reviewed_at IS NULL;
UPDATE public.seller_country_requirements SET required_fields='{registration_number}', required_documents='{incorporation_or_registration_document}', conditional_requirements='[]'::jsonb
 WHERE country='CA' AND rules_version='ca-v1' AND business_type='company' AND stripe_connect_enabled=false AND reviewed_at IS NULL;