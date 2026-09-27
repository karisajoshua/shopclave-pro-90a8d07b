-- DEVELOPMENT DRAFT: transactional notification outbox.
-- Never put identity documents, payout identifiers or sensitive KYC data in email payloads.
CREATE TABLE IF NOT EXISTS public.seller_notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.seller_applications(id),
 event_type text NOT NULL CHECK(event_type IN (
  'submitted','under_review','more_information_required','rejected','approved')),
 recipient_user_id uuid NOT NULL REFERENCES auth.users(id),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 last_error text
);
CREATE INDEX IF NOT EXISTS seller_outbox_pending ON public.seller_notification_outbox(created_at)
 WHERE delivered_at IS NULL;
ALTER TABLE public.seller_notification_outbox ENABLE ROW LEVEL SECURITY;
-- Service-only outbox: browser users cannot read or forge notifications.
CREATE OR REPLACE FUNCTION public.enqueue_seller_application_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF TG_OP='INSERT' AND NEW.new_status NOT IN
 ('submitted','under_review','more_information_required','rejected','approved')
 THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  INSERT INTO public.seller_notification_outbox(application_id,event_type,recipient_user_id,payload)
  SELECT NEW.application_id,NEW.new_status,a.user_id,
   CASE WHEN NEW.new_status IN ('rejected','more_information_required')
    THEN jsonb_build_object('review_note',left(coalesce(NEW.reason,''),500))
    ELSE '{}'::jsonb END
  FROM public.seller_applications a WHERE a.id=NEW.application_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER seller_application_event_notification
 AFTER INSERT ON public.seller_application_events
 FOR EACH ROW EXECUTE FUNCTION public.enqueue_seller_application_event();
