-- DEVELOPMENT DRAFT. Admin can record independently verified KYC only after
-- inspecting documents/provider evidence outside this function.
CREATE OR REPLACE FUNCTION public.record_seller_kyc_review(
 p_application_id uuid,p_result text,p_reason text
) RETURNS public.seller_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
 previous_kyc text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id=(SELECT auth.uid()) AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_result NOT IN ('verified','action_required','rejected')
 OR nullif(btrim(p_reason),'') IS NULL
 THEN RAISE EXCEPTION 'Documented verification decision required'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=p_application_id FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('submitted','under_review') THEN
  RAISE EXCEPTION 'Application not ready for KYC review'; END IF;
 IF p_result='verified' AND NOT EXISTS(SELECT 1 FROM public.seller_country_requirements r
  WHERE r.country=a.country AND r.business_type=a.business_type
  AND r.rules_version=a.rules_version AND r.stripe_connect_enabled=true
  AND r.reviewed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Approved country rules required'; END IF;
 IF p_result='verified' AND NOT EXISTS(SELECT 1 FROM public.seller_country_requirements r
 WHERE r.country=a.country AND r.business_type=a.business_type
 AND r.rules_version=a.rules_version AND cardinality(r.required_documents)>0)
 THEN RAISE EXCEPTION 'Independent KYC evidence requirements are not configured'; END IF;
 IF p_result='verified' AND EXISTS(
  SELECT 1 FROM public.seller_country_requirements r
  CROSS JOIN LATERAL unnest(r.required_documents) AS required(code)
  WHERE r.country=a.country AND r.business_type=a.business_type
  AND r.rules_version=a.rules_version
  AND NOT EXISTS(SELECT 1 FROM public.seller_verification_documents d
   WHERE d.application_id=a.id AND d.requirement_code=required.code
   AND d.verification_status='verified')
 ) THEN RAISE EXCEPTION 'Required documents not independently verified'; END IF;
 previous_kyc:=a.kyc_status;
 UPDATE public.seller_applications SET kyc_status=p_result,reviewed_by=(SELECT auth.uid()),
 review_reason=p_reason,reviewed_at=now(),updated_at=now()
 WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status,reason)
 VALUES(a.id,(SELECT auth.uid()),'kyc:'||coalesce(previous_kyc,'unknown'),
 'kyc:'||p_result,p_reason);
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.record_seller_kyc_review(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_seller_kyc_review(uuid,text,text) TO authenticated;
-- Actual document/provider verification, private storage, retention and evidence
-- audit are separate required components. Never infer KYC from a user upload alone.
