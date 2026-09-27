-- DEVELOPMENT DRAFT ONLY. Requires 001, 004 and 011.
-- Registers a private document only after an authenticated owner uploads it.
-- Upload alone NEVER marks KYC verified. Reviewers must verify independently.
CREATE OR REPLACE FUNCTION public.register_seller_kyc_upload(
 p_requirement_code text,p_storage_path text
) RETURNS public.seller_verification_documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
 r public.seller_country_requirements;
 d public.seller_verification_documents;
 owner_prefix text;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO a FROM public.seller_applications
 WHERE user_id=(SELECT auth.uid()) FOR UPDATE;
 IF a.id IS NULL OR a.status <> 'draft' THEN RAISE EXCEPTION 'No editable seller draft'; END IF;
 SELECT * INTO r FROM public.seller_country_requirements
 WHERE country=a.country AND business_type=a.business_type
 AND stripe_connect_enabled=true AND reviewed_at IS NOT NULL
 ORDER BY reviewed_at DESC LIMIT 1;
 IF r.country IS NULL OR NOT (p_requirement_code=ANY(r.required_documents))
 THEN RAISE EXCEPTION 'Unsupported verification requirement'; END IF;
 owner_prefix:=(SELECT auth.uid())::text||'/'||a.id::text||'/';
 IF p_storage_path IS NULL OR left(p_storage_path,length(owner_prefix))<>owner_prefix
 OR length(p_storage_path)>400 OR p_storage_path ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'Invalid private document path'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='seller-kyc-private'
 AND o.name=p_storage_path)
 THEN RAISE EXCEPTION 'Private upload does not exist'; END IF;
 INSERT INTO public.seller_verification_documents
 (application_id,requirement_code,private_storage_path,verification_status)
 VALUES(a.id,p_requirement_code,p_storage_path,'pending')
 RETURNING * INTO d;
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.register_seller_kyc_upload(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_seller_kyc_upload(text,text) TO authenticated;
