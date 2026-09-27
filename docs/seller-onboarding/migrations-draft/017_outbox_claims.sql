-- DEVELOPMENT DRAFT: claim outbox records atomically to avoid duplicate workers.
ALTER TABLE public.seller_notification_outbox
 ADD COLUMN IF NOT EXISTS claimed_until timestamptz,
 ADD COLUMN IF NOT EXISTS claim_token uuid;
CREATE OR REPLACE FUNCTION public.claim_seller_notifications(p_limit integer DEFAULT 20)
RETURNS SETOF public.seller_notification_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Service role only'; END IF;
 RETURN QUERY WITH selected AS (
  SELECT id FROM public.seller_notification_outbox
  WHERE delivered_at IS NULL AND attempts<8
   AND (claimed_until IS NULL OR claimed_until<now())
  ORDER BY created_at LIMIT LEAST(GREATEST(p_limit,1),30)
  FOR UPDATE SKIP LOCKED
 ) UPDATE public.seller_notification_outbox o
 SET claimed_until=now()+interval '5 minutes',claim_token=gen_random_uuid(),
 attempts=attempts+1
 FROM selected WHERE o.id=selected.id RETURNING o.*;
END $$;
CREATE OR REPLACE FUNCTION public.complete_seller_notification(
 p_id uuid,p_claim_token uuid,p_delivered boolean,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Service role only'; END IF;
 UPDATE public.seller_notification_outbox SET
  delivered_at=CASE WHEN p_delivered THEN now() ELSE NULL END,
  last_error=CASE WHEN p_delivered THEN NULL ELSE left(coalesce(p_error,'Delivery failed'),200) END,
  claimed_until=NULL,claim_token=NULL
 WHERE id=p_id AND claim_token=p_claim_token AND delivered_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_seller_notifications(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_seller_notification(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_seller_notifications(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_seller_notification(uuid,uuid,boolean,text) TO service_role;
