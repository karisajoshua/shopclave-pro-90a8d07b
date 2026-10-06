-- DEVELOPMENT DRAFT ONLY: run after 001; verify database roles before deployment.
-- A single RPC exposes a narrow allowlist for draft autosave. No client UPDATE
-- access to review, vendor, payment or verification fields.
CREATE OR REPLACE FUNCTION public.save_seller_application_draft(
 p_current_step smallint,
 p_country text,
 p_business_type text,
 p_business_info jsonb,
 p_store_info jsonb
) RETURNS public.seller_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_current_step NOT BETWEEN 1 AND 7 OR
    (p_country IS NOT NULL AND p_country !~ '^[A-Z]{2}$') OR
    (p_business_type IS NOT NULL AND p_business_type NOT IN ('individual','sole_proprietor','company')) OR
    jsonb_typeof(p_business_info) IS DISTINCT FROM 'object' OR
    jsonb_typeof(p_store_info) IS DISTINCT FROM 'object' OR
    pg_column_size(p_business_info)>16384 OR pg_column_size(p_store_info)>16384
 THEN RAISE EXCEPTION 'Invalid seller application draft'; END IF;
 INSERT INTO public.seller_applications(user_id,current_step,country,business_type,business_info,store_info)
 VALUES(auth.uid(),p_current_step,p_country,p_business_type,p_business_info,p_store_info)
 ON CONFLICT(user_id) DO UPDATE SET
 current_step=EXCLUDED.current_step,
 country=EXCLUDED.country,
 business_type=EXCLUDED.business_type,
 business_info=EXCLUDED.business_info,
 store_info=EXCLUDED.store_info,
 updated_at=now()
 WHERE public.seller_applications.status = 'draft'
 RETURNING * INTO a;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Application cannot be edited in its current state'; END IF;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.save_seller_application_draft(smallint,text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_seller_application_draft(smallint,text,text,jsonb,jsonb) TO authenticated;
-- Avoid accepting identity-document contents, account credentials or bank details in JSON.
-- Before production, enforce explicit JSON schemas and request size limits at RPC/API layer.
