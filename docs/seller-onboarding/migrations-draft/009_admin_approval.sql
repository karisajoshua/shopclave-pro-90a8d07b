-- DEVELOPMENT DRAFT ONLY. Verify deployed vendor table, user roles, and KYC workflow.
-- Approval and vendor activation happen in one database transaction.
CREATE OR REPLACE FUNCTION public.approve_seller_application(p_application_id uuid)
RETURNS public.seller_applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE a public.seller_applications;
 existing_vendor uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id=(SELECT auth.uid()) AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=p_application_id FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('submitted','under_review') THEN
  RAISE EXCEPTION 'Application cannot be approved in current state'; END IF;
 IF a.kyc_status <> 'verified' THEN RAISE EXCEPTION 'Verified KYC required'; END IF;
 IF a.rules_version IS NULL THEN RAISE EXCEPTION 'Submitted country rules missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.seller_country_requirements r
  WHERE r.country=a.country AND r.business_type=a.business_type
  AND r.rules_version=a.rules_version AND r.stripe_connect_enabled=true
  AND r.reviewed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Country or business type no longer enabled'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.seller_payout_accounts p
  WHERE p.application_id=a.id AND p.provider='stripe'
  AND nullif(p.provider_account_id,'') IS NOT NULL AND p.country=a.country)
 THEN RAISE EXCEPTION 'Stripe Connect account missing'; END IF;
 -- Existing vendor accounts must not be overwritten or silently reapproved.
 SELECT id INTO existing_vendor FROM public.vendors WHERE user_id=a.user_id FOR UPDATE;
 IF existing_vendor IS NOT NULL AND a.vendor_id IS DISTINCT FROM existing_vendor THEN
  RAISE EXCEPTION 'Existing vendor requires manual migration review'; END IF;
 IF existing_vendor IS NULL THEN
  INSERT INTO public.vendors(user_id,store_name,store_description,phone,status)
  VALUES(a.user_id,a.store_info->>'store_name',a.store_info->>'store_description',
   a.business_info->>'phone','approved')
  RETURNING id INTO existing_vendor;
 ELSE
  UPDATE public.vendors SET status='approved' WHERE id=existing_vendor;
 END IF;
 UPDATE public.seller_applications SET status='approved',vendor_id=existing_vendor,
 reviewed_by=(SELECT auth.uid()),reviewed_at=now(),updated_at=now()
 WHERE id=a.id RETURNING * INTO a;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status)
 VALUES(a.id,(SELECT auth.uid()),'under_review','approved');
 -- Payout status is deliberately not modified by Barakaz approval.
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.approve_seller_application(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_seller_application(uuid) TO authenticated;
