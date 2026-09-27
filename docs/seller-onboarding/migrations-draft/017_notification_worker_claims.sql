-- DEVELOPMENT DRAFT. Claim messages transactionally for a trusted service worker.
ALTER TABLE public.seller_notification_outbox
 ADD COLUMN IF NOT EXISTS claimed_until timestamptz;
CREATE OR REPLACE FUNCTION public.claim_seller_notifications(p_limit integer DEFAULT 10)
RETURNS SETOF public.seller_notification_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Service role only'; END IF;
 IF p_limit NOT BETWEEN 1 AND 25 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
 RETURN QUERY WITH next_batch AS (
  SELECT o.id FROM public.seller_notification_outbox o
  WHERE o.delivered_at IS NULL AND o.attempts<10
  AND (o.claimed_until IS NULL OR o.claimed_until<now())
  ORDER BY o.created_at FOR UPDATE SKIP LOCKED LIMIT p_limit
 ) UPDATE public.seller_notification_outbox o
 SET claimed_until=now()+interval '3 minutes',attempts=o.attempts+1
 FROM next_batch WHERE o.id=next_batch.id RETURNING o.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_seller_notifications(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_seller_notifications(integer) TO service_role;
CREATE OR REPLACE FUNCTION public.complete_seller_notification(
 p_id uuid,p_delivered boolean,p_error text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Service role only'; END IF;
 UPDATE public.seller_notification_outbox SET
 delivered_at=CASE WHEN p_delivered THEN now() ELSE delivered_at END,
 claimed_until=NULL,last_error=CASE WHEN p_delivered THEN NULL ELSE left(p_error,500) END
 WHERE id=p_id AND delivered_at IS NULL AND claimed_until>now();
END $$;
REVOKE ALL ON FUNCTION public.complete_seller_notification(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_seller_notification(uuid,boolean,text) TO service_role;
