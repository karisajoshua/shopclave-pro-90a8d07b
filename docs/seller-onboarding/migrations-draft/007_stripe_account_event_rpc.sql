-- DEVELOPMENT DRAFT. Transactional, replay-safe Stripe account status updates.
CREATE OR REPLACE FUNCTION public.record_seller_stripe_account_event(
 p_event_id text,p_account_id text,p_created_at timestamptz,
 p_charges_enabled boolean,p_payouts_enabled boolean,p_details_submitted boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE updated_rows integer;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Service role only'; END IF;
 IF nullif(p_event_id,'') IS NULL OR nullif(p_account_id,'') IS NULL
 OR p_created_at IS NULL THEN RAISE EXCEPTION 'Invalid webhook'; END IF;
 INSERT INTO public.seller_stripe_webhook_events(event_id,account_id)
 VALUES(p_event_id,p_account_id) ON CONFLICT(event_id) DO NOTHING;
 GET DIAGNOSTICS updated_rows=ROW_COUNT;
 IF updated_rows=0 THEN RETURN false; END IF;
 UPDATE public.seller_payout_accounts SET
 charges_enabled=p_charges_enabled,payouts_enabled=p_payouts_enabled,
 verification_status=CASE WHEN p_payouts_enabled AND p_details_submitted THEN 'verified'
 WHEN p_details_submitted THEN 'pending' ELSE 'action_required' END,
 last_webhook_at=p_created_at
 WHERE provider='stripe' AND provider_account_id=p_account_id
 AND (last_webhook_at IS NULL OR last_webhook_at<=p_created_at);
 IF NOT FOUND AND NOT EXISTS(SELECT 1 FROM public.seller_payout_accounts
 WHERE provider='stripe' AND provider_account_id=p_account_id)
 THEN RAISE EXCEPTION 'Unknown connected account'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_seller_stripe_account_event(text,text,timestamptz,boolean,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_seller_stripe_account_event(text,text,timestamptz,boolean,boolean,boolean) TO service_role;
