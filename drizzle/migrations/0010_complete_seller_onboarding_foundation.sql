CREATE TABLE public.seller_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  vendor_id uuid UNIQUE REFERENCES public.vendors(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','more_information_required','approved','rejected')),
  current_step smallint NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  country text CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  business_type text CHECK (business_type IS NULL OR business_type IN ('individual','sole_proprietor','company')),
  business_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  store_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules_version text,
  kyc_status text NOT NULL DEFAULT 'not_started' CHECK (kyc_status IN ('not_started','pending','action_required','verified','rejected')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_applications TO authenticated;
GRANT ALL ON public.seller_applications TO service_role;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_application_owner_read ON public.seller_applications FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY seller_application_admin_read ON public.seller_applications FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.seller_country_requirements (
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  business_type text NOT NULL CHECK (business_type IN ('individual','sole_proprietor','company')),
  rules_version text NOT NULL,
  stripe_connect_enabled boolean NOT NULL DEFAULT false,
  required_documents text[] NOT NULL DEFAULT '{}'::text[],
  required_fields text[] NOT NULL DEFAULT '{}'::text[],
  reviewed_at timestamptz,
  PRIMARY KEY(country,business_type,rules_version)
);
GRANT SELECT ON public.seller_country_requirements TO authenticated;
GRANT ALL ON public.seller_country_requirements TO service_role;
ALTER TABLE public.seller_country_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_country_requirements_read ON public.seller_country_requirements FOR SELECT TO authenticated USING (reviewed_at IS NOT NULL);
CREATE POLICY seller_country_requirements_admin_read ON public.seller_country_requirements FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.seller_agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.seller_applications(id) ON DELETE CASCADE,
  policy_code text NOT NULL,
  policy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  accepted_by uuid NOT NULL,
  UNIQUE(application_id,policy_code,policy_version)
);
GRANT SELECT ON public.seller_agreement_acceptances TO authenticated;
GRANT ALL ON public.seller_agreement_acceptances TO service_role;
ALTER TABLE public.seller_agreement_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_agreements_owner_read ON public.seller_agreement_acceptances FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.seller_applications a WHERE a.id=application_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY seller_agreements_admin_read ON public.seller_agreement_acceptances FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.seller_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.seller_applications(id) ON DELETE CASCADE,
  actor_id uuid,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_application_events TO authenticated;
GRANT ALL ON public.seller_application_events TO service_role;
ALTER TABLE public.seller_application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_events_owner_read ON public.seller_application_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.seller_applications a WHERE a.id=application_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY seller_events_admin_read ON public.seller_application_events FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.seller_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.seller_applications(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('stripe')),
  provider_account_id text,
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  currency text,
  verification_status text NOT NULL DEFAULT 'not_started' CHECK (verification_status IN ('not_started','pending','action_required','verified','restricted','disabled')),
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  last_webhook_at timestamptz,
  UNIQUE(application_id,provider)
);
GRANT SELECT ON public.seller_payout_accounts TO authenticated;
GRANT ALL ON public.seller_payout_accounts TO service_role;
ALTER TABLE public.seller_payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_payout_owner_read ON public.seller_payout_accounts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.seller_applications a WHERE a.id=application_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY seller_payout_admin_read ON public.seller_payout_accounts FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.seller_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.seller_applications(id) ON DELETE CASCADE,
  requirement_code text NOT NULL,
  private_storage_path text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text,
  UNIQUE(application_id,requirement_code)
);
GRANT SELECT ON public.seller_verification_documents TO authenticated;
GRANT ALL ON public.seller_verification_documents TO service_role;
ALTER TABLE public.seller_verification_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_documents_owner_read ON public.seller_verification_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.seller_applications a WHERE a.id=application_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY seller_documents_admin_read ON public.seller_verification_documents FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.seller_policy_documents (
  policy_code text NOT NULL CHECK (policy_code IN ('seller_terms','commission_payout','shipping_fulfillment','returns_refunds','prohibited_products','product_authenticity')),
  policy_version text NOT NULL,
  title text NOT NULL,
  document_url text NOT NULL CHECK (document_url ~ '^https://'),
  published_at timestamptz,
  PRIMARY KEY(policy_code,policy_version)
);
GRANT SELECT ON public.seller_policy_documents TO authenticated;
GRANT ALL ON public.seller_policy_documents TO service_role;
ALTER TABLE public.seller_policy_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_policies_published_read ON public.seller_policy_documents FOR SELECT TO authenticated USING (published_at IS NOT NULL);
CREATE POLICY seller_policies_admin_read ON public.seller_policy_documents FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.seller_stripe_webhook_events (
  event_id text PRIMARY KEY,
  account_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seller_stripe_webhook_events TO service_role;
ALTER TABLE public.seller_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.seller_document_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.seller_verification_documents(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('signed_url_issued')),
  accessed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seller_document_access_events TO service_role;
ALTER TABLE public.seller_document_access_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.seller_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.seller_applications(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('submitted','under_review','more_information_required','rejected','approved')),
  recipient_user_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  claimed_until timestamptz,
  claim_token uuid
);
GRANT ALL ON public.seller_notification_outbox TO service_role;
ALTER TABLE public.seller_notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE INDEX seller_applications_review_queue ON public.seller_applications(status,submitted_at DESC);
CREATE INDEX seller_events_application_time ON public.seller_application_events(application_id,created_at DESC);
CREATE INDEX seller_documents_application ON public.seller_verification_documents(application_id,uploaded_at DESC);
CREATE INDEX seller_outbox_pending ON public.seller_notification_outbox(created_at) WHERE delivered_at IS NULL;

CREATE OR REPLACE FUNCTION public.save_seller_application_draft(p_current_step smallint,p_country text,p_business_type text,p_business_info jsonb,p_store_info jsonb)
RETURNS public.seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_current_step NOT BETWEEN 1 AND 7 OR (p_country IS NOT NULL AND p_country !~ '^[A-Z]{2}$') OR (p_business_type IS NOT NULL AND p_business_type NOT IN ('individual','sole_proprietor','company')) OR jsonb_typeof(p_business_info) IS DISTINCT FROM 'object' OR jsonb_typeof(p_store_info) IS DISTINCT FROM 'object' OR pg_column_size(p_business_info)>32768 OR pg_column_size(p_store_info)>32768 THEN RAISE EXCEPTION 'Invalid seller application draft'; END IF;
 INSERT INTO public.seller_applications(user_id,current_step,country,business_type,business_info,store_info)
 VALUES((SELECT auth.uid()),p_current_step,p_country,p_business_type,p_business_info,p_store_info)
 ON CONFLICT(user_id) DO UPDATE SET current_step=EXCLUDED.current_step,country=EXCLUDED.country,business_type=EXCLUDED.business_type,business_info=EXCLUDED.business_info,store_info=EXCLUDED.store_info,updated_at=now()
 WHERE public.seller_applications.status IN ('draft','more_information_required')
 RETURNING * INTO a;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Application cannot be edited in its current state'; END IF;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.save_seller_application_draft(smallint,text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_seller_application_draft(smallint,text,text,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_seller_agreements(p_codes text[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications; r public.seller_country_requirements; code text;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('draft','more_information_required') THEN RAISE EXCEPTION 'No editable application'; END IF;
 SELECT * INTO r FROM public.seller_country_requirements WHERE country=a.country AND business_type=a.business_type AND stripe_connect_enabled=true AND reviewed_at IS NOT NULL ORDER BY reviewed_at DESC LIMIT 1;
 IF r.country IS NULL THEN RAISE EXCEPTION 'Seller applications are not yet open for this country and business type'; END IF;
 IF p_codes IS NULL OR cardinality(p_codes)<>6 OR cardinality(p_codes)<>(SELECT count(DISTINCT x) FROM unnest(p_codes) AS t(x)) THEN RAISE EXCEPTION 'All six seller agreements are required'; END IF;
 FOREACH code IN ARRAY p_codes LOOP
  IF code NOT IN ('seller_terms','commission_payout','shipping_fulfillment','returns_refunds','prohibited_products','product_authenticity') THEN RAISE EXCEPTION 'Unknown agreement'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.seller_policy_documents d WHERE d.policy_code=code AND d.policy_version=r.rules_version AND d.published_at IS NOT NULL) THEN RAISE EXCEPTION 'Required seller policy is not published: %',code; END IF;
  INSERT INTO public.seller_agreement_acceptances(application_id,policy_code,policy_version,accepted_by) VALUES(a.id,code,r.rules_version,(SELECT auth.uid())) ON CONFLICT(application_id,policy_code,policy_version) DO NOTHING;
 END LOOP;
 RETURN (SELECT count(*) FROM public.seller_agreement_acceptances WHERE application_id=a.id AND policy_version=r.rules_version)::integer;
END $$;
REVOKE ALL ON FUNCTION public.accept_seller_agreements(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_seller_agreements(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_seller_kyc_upload(p_requirement_code text,p_storage_path text)
RETURNS public.seller_verification_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications; r public.seller_country_requirements; d public.seller_verification_documents; owner_prefix text;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('draft','more_information_required') THEN RAISE EXCEPTION 'No editable seller draft'; END IF;
 SELECT * INTO r FROM public.seller_country_requirements WHERE country=a.country AND business_type=a.business_type AND stripe_connect_enabled=true AND reviewed_at IS NOT NULL ORDER BY reviewed_at DESC LIMIT 1;
 IF r.country IS NULL OR NOT (p_requirement_code=ANY(r.required_documents)) THEN RAISE EXCEPTION 'Unsupported verification requirement'; END IF;
 owner_prefix:=(SELECT auth.uid())::text||'/'||a.id::text||'/';
 IF p_storage_path IS NULL OR left(p_storage_path,length(owner_prefix))<>owner_prefix OR length(p_storage_path)>400 OR p_storage_path ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Invalid private document path'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='seller-kyc-private' AND o.name=p_storage_path) THEN RAISE EXCEPTION 'Private upload does not exist'; END IF;
 INSERT INTO public.seller_verification_documents(application_id,requirement_code,private_storage_path,verification_status,uploaded_at,reviewed_at,reviewed_by,review_reason)
 VALUES(a.id,p_requirement_code,p_storage_path,'pending',now(),NULL,NULL,NULL)
 ON CONFLICT(application_id,requirement_code) DO UPDATE SET private_storage_path=EXCLUDED.private_storage_path,verification_status='pending',uploaded_at=now(),reviewed_at=NULL,reviewed_by=NULL,review_reason=NULL
 RETURNING * INTO d;
 UPDATE public.seller_applications SET kyc_status='pending',updated_at=now() WHERE id=a.id;
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.register_seller_kyc_upload(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_seller_kyc_upload(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_seller_application()
RETURNS public.seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications; r public.seller_country_requirements; code text; previous_status text;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('draft','more_information_required') THEN RAISE EXCEPTION 'No editable application'; END IF;
 SELECT * INTO r FROM public.seller_country_requirements WHERE country=a.country AND business_type=a.business_type AND stripe_connect_enabled=true AND reviewed_at IS NOT NULL ORDER BY reviewed_at DESC LIMIT 1;
 IF r.country IS NULL THEN RAISE EXCEPTION 'Applications are not yet open for this country and business type'; END IF;
 IF nullif(btrim(a.business_info->>'full_name'),'') IS NULL OR nullif(btrim(a.business_info->>'phone'),'') IS NULL OR nullif(btrim(a.business_info->>'legal_name'),'') IS NULL OR nullif(btrim(a.business_info->>'address'),'') IS NULL OR nullif(btrim(a.business_info->>'category'),'') IS NULL OR nullif(btrim(a.store_info->>'store_name'),'') IS NULL OR nullif(btrim(a.store_info->>'store_description'),'') IS NULL OR nullif(btrim(a.store_info->>'logo_url'),'') IS NULL OR nullif(btrim(a.store_info->>'product_categories'),'') IS NULL OR nullif(btrim(a.store_info->>'ship_from'),'') IS NULL OR nullif(btrim(a.store_info->>'return_address'),'') IS NULL THEN RAISE EXCEPTION 'Required account, business, or store information is missing'; END IF;
 IF a.business_type IN ('sole_proprietor','company') AND nullif(btrim(a.business_info->>'registration_number'),'') IS NULL THEN RAISE EXCEPTION 'Business registration number is required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.seller_payout_accounts p WHERE p.application_id=a.id AND p.provider='stripe' AND nullif(p.provider_account_id,'') IS NOT NULL AND p.country=a.country AND p.verification_status NOT IN ('disabled','restricted')) THEN RAISE EXCEPTION 'Payout setup must be started before submission'; END IF;
 FOREACH code IN ARRAY r.required_fields LOOP IF nullif(btrim(coalesce(a.business_info->>code,a.store_info->>code,'')),'') IS NULL THEN RAISE EXCEPTION 'Missing required country field: %',code; END IF; END LOOP;
 FOREACH code IN ARRAY r.required_documents LOOP IF NOT EXISTS (SELECT 1 FROM public.seller_verification_documents d WHERE d.application_id=a.id AND d.requirement_code=code AND d.verification_status IN ('pending','verified')) THEN RAISE EXCEPTION 'Missing required verification document: %',code; END IF; END LOOP;
 FOREACH code IN ARRAY ARRAY['seller_terms','commission_payout','shipping_fulfillment','returns_refunds','prohibited_products','product_authenticity'] LOOP IF NOT EXISTS (SELECT 1 FROM public.seller_agreement_acceptances t WHERE t.application_id=a.id AND t.policy_code=code AND t.policy_version=r.rules_version AND t.accepted_by=(SELECT auth.uid())) THEN RAISE EXCEPTION 'Required agreement not accepted: %',code; END IF; END LOOP;
 previous_status:=a.status;
 UPDATE public.seller_applications SET status='submitted',rules_version=r.rules_version,current_step=7,submitted_at=now(),reviewed_at=NULL,reviewed_by=NULL,review_reason=NULL,updated_at=now() WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status) VALUES(a.id,(SELECT auth.uid()),previous_status,'submitted');
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.submit_seller_application() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_seller_application() TO authenticated;

CREATE OR REPLACE FUNCTION public.review_seller_application(p_application_id uuid,p_decision text,p_reason text)
RETURNS public.seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications; previous_status text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.has_role((SELECT auth.uid()),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_decision NOT IN ('under_review','more_information_required','rejected') THEN RAISE EXCEPTION 'Unsupported review decision'; END IF;
 IF p_decision IN ('more_information_required','rejected') AND nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Review reason is required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=p_application_id FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('submitted','under_review','more_information_required') THEN RAISE EXCEPTION 'Application cannot be reviewed in current state'; END IF;
 previous_status:=a.status;
 UPDATE public.seller_applications SET status=p_decision,reviewed_by=(SELECT auth.uid()),reviewed_at=now(),review_reason=nullif(btrim(p_reason),''),updated_at=now() WHERE id=p_application_id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status,reason) VALUES(p_application_id,(SELECT auth.uid()),previous_status,p_decision,nullif(btrim(p_reason),''));
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.review_seller_application(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_seller_application(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_seller_document(p_document_id uuid,p_decision text,p_reason text)
RETURNS public.seller_verification_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE d public.seller_verification_documents; a public.seller_applications;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.has_role((SELECT auth.uid()),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_decision NOT IN ('verified','rejected') OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Decision and evidence note required'; END IF;
 SELECT * INTO d FROM public.seller_verification_documents WHERE id=p_document_id FOR UPDATE;
 IF d.id IS NULL OR d.verification_status<>'pending' THEN RAISE EXCEPTION 'Document not pending review'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=d.application_id FOR UPDATE;
 IF a.status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'Application is not reviewable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.seller_document_access_events e WHERE e.document_id=d.id AND e.reviewer_id=(SELECT auth.uid()) AND e.accessed_at>now()-interval '24 hours') THEN RAISE EXCEPTION 'Review the private document before deciding'; END IF;
 UPDATE public.seller_verification_documents SET verification_status=p_decision,reviewed_at=now(),reviewed_by=(SELECT auth.uid()),review_reason=left(btrim(p_reason),500) WHERE id=d.id RETURNING * INTO d;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status,reason) VALUES(a.id,(SELECT auth.uid()),'document:pending','document:'||p_decision,'Document '||d.requirement_code||': '||left(p_reason,500));
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.review_seller_document(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_seller_document(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_seller_kyc_review(p_application_id uuid,p_result text,p_reason text)
RETURNS public.seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications; previous_kyc text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.has_role((SELECT auth.uid()),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_result NOT IN ('verified','action_required','rejected') OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Documented verification decision required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=p_application_id FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'Application not ready for KYC review'; END IF;
 IF p_result='verified' AND NOT EXISTS(SELECT 1 FROM public.seller_country_requirements r WHERE r.country=a.country AND r.business_type=a.business_type AND r.rules_version=a.rules_version AND r.stripe_connect_enabled=true AND r.reviewed_at IS NOT NULL AND cardinality(r.required_documents)>0) THEN RAISE EXCEPTION 'Independent KYC evidence requirements are not configured'; END IF;
 IF p_result='verified' AND EXISTS(SELECT 1 FROM public.seller_country_requirements r CROSS JOIN LATERAL unnest(r.required_documents) AS required(code) WHERE r.country=a.country AND r.business_type=a.business_type AND r.rules_version=a.rules_version AND NOT EXISTS(SELECT 1 FROM public.seller_verification_documents d WHERE d.application_id=a.id AND d.requirement_code=required.code AND d.verification_status='verified')) THEN RAISE EXCEPTION 'Required documents not independently verified'; END IF;
 previous_kyc:=a.kyc_status;
 UPDATE public.seller_applications SET kyc_status=p_result,reviewed_by=(SELECT auth.uid()),review_reason=left(btrim(p_reason),500),reviewed_at=now(),updated_at=now() WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status,reason) VALUES(a.id,(SELECT auth.uid()),'kyc:'||coalesce(previous_kyc,'unknown'),'kyc:'||p_result,left(p_reason,500));
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.record_seller_kyc_review(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_seller_kyc_review(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_seller_application(p_application_id uuid)
RETURNS public.seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications; existing_vendor uuid; previous_status text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.has_role((SELECT auth.uid()),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=p_application_id FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'Application cannot be approved in current state'; END IF;
 IF a.kyc_status <> 'verified' THEN RAISE EXCEPTION 'Verified KYC required'; END IF;
 IF a.rules_version IS NULL OR NOT EXISTS(SELECT 1 FROM public.seller_country_requirements r WHERE r.country=a.country AND r.business_type=a.business_type AND r.rules_version=a.rules_version AND r.stripe_connect_enabled=true AND r.reviewed_at IS NOT NULL) THEN RAISE EXCEPTION 'Current reviewed country rules required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.seller_payout_accounts p WHERE p.application_id=a.id AND p.provider='stripe' AND nullif(p.provider_account_id,'') IS NOT NULL AND p.country=a.country) THEN RAISE EXCEPTION 'Stripe Connect account missing'; END IF;
 previous_status:=a.status;
 SELECT id INTO existing_vendor FROM public.vendors WHERE user_id=a.user_id FOR UPDATE;
 IF existing_vendor IS NULL THEN
  INSERT INTO public.vendors(user_id,store_name,store_description,logo_url,phone,status,warehouse_address) VALUES(a.user_id,a.store_info->>'store_name',a.store_info->>'store_description',a.store_info->>'logo_url',a.business_info->>'phone','approved',jsonb_build_object('address',a.store_info->>'ship_from','country',a.country)) RETURNING id INTO existing_vendor;
 ELSE
  UPDATE public.vendors SET status='approved',store_name=a.store_info->>'store_name',store_description=a.store_info->>'store_description',logo_url=a.store_info->>'logo_url',phone=a.business_info->>'phone',updated_at=now() WHERE id=existing_vendor;
 END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(a.user_id,'vendor') ON CONFLICT(user_id,role) DO NOTHING;
 UPDATE public.seller_applications SET status='approved',vendor_id=existing_vendor,reviewed_by=(SELECT auth.uid()),reviewed_at=now(),review_reason=NULL,updated_at=now() WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status) VALUES(a.id,(SELECT auth.uid()),previous_status,'approved');
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.approve_seller_application(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_seller_application(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_seller_stripe_account_event(p_event_id text,p_account_id text,p_created_at timestamptz,p_charges_enabled boolean,p_payouts_enabled boolean,p_details_submitted boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE updated_rows integer;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role only'; END IF;
 IF nullif(p_event_id,'') IS NULL OR nullif(p_account_id,'') IS NULL OR p_created_at IS NULL THEN RAISE EXCEPTION 'Invalid webhook'; END IF;
 INSERT INTO public.seller_stripe_webhook_events(event_id,account_id) VALUES(p_event_id,p_account_id) ON CONFLICT(event_id) DO NOTHING;
 GET DIAGNOSTICS updated_rows=ROW_COUNT;
 IF updated_rows=0 THEN RETURN false; END IF;
 UPDATE public.seller_payout_accounts SET charges_enabled=p_charges_enabled,payouts_enabled=p_payouts_enabled,verification_status=CASE WHEN p_payouts_enabled AND p_details_submitted THEN 'verified' WHEN p_details_submitted THEN 'pending' ELSE 'action_required' END,last_webhook_at=p_created_at WHERE provider='stripe' AND provider_account_id=p_account_id AND (last_webhook_at IS NULL OR last_webhook_at<=p_created_at);
 IF NOT FOUND AND NOT EXISTS(SELECT 1 FROM public.seller_payout_accounts WHERE provider='stripe' AND provider_account_id=p_account_id) THEN RAISE EXCEPTION 'Unknown connected account'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_seller_stripe_account_event(text,text,timestamptz,boolean,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_seller_stripe_account_event(text,text,timestamptz,boolean,boolean,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_seller_application_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.new_status NOT IN ('submitted','under_review','more_information_required','rejected','approved') THEN RETURN NEW; END IF;
 INSERT INTO public.seller_notification_outbox(application_id,event_type,recipient_user_id,payload)
 SELECT NEW.application_id,NEW.new_status,a.user_id,CASE WHEN NEW.new_status IN ('rejected','more_information_required') THEN jsonb_build_object('review_note',left(coalesce(NEW.reason,''),500)) ELSE '{}'::jsonb END FROM public.seller_applications a WHERE a.id=NEW.application_id;
 RETURN NEW;
END $$;
CREATE TRIGGER seller_application_event_notification AFTER INSERT ON public.seller_application_events FOR EACH ROW EXECUTE FUNCTION public.enqueue_seller_application_event();

CREATE OR REPLACE FUNCTION public.claim_seller_notifications(p_limit integer DEFAULT 20)
RETURNS SETOF public.seller_notification_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role only'; END IF;
 RETURN QUERY WITH selected AS (SELECT id FROM public.seller_notification_outbox WHERE delivered_at IS NULL AND attempts<8 AND (claimed_until IS NULL OR claimed_until<now()) ORDER BY created_at LIMIT LEAST(GREATEST(p_limit,1),30) FOR UPDATE SKIP LOCKED) UPDATE public.seller_notification_outbox o SET claimed_until=now()+interval '5 minutes',claim_token=gen_random_uuid(),attempts=attempts+1 FROM selected WHERE o.id=selected.id RETURNING o.*;
END $$;
CREATE OR REPLACE FUNCTION public.complete_seller_notification(p_id uuid,p_claim_token uuid,p_delivered boolean,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role only'; END IF;
 UPDATE public.seller_notification_outbox SET delivered_at=CASE WHEN p_delivered THEN now() ELSE NULL END,last_error=CASE WHEN p_delivered THEN NULL ELSE left(coalesce(p_error,'Delivery failed'),200) END,claimed_until=NULL,claim_token=NULL WHERE id=p_id AND claim_token=p_claim_token AND delivered_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_seller_notifications(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_seller_notification(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_seller_notifications(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_seller_notification(uuid,uuid,boolean,text) TO service_role;