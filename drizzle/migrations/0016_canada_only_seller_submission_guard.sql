CREATE OR REPLACE FUNCTION public.guard_seller_application_launch_country()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Canada-only launch: drafts from any country may be saved (interest/waitlist),
  -- but only Canadian applications may move out of draft into review.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('submitted','under_review','approved')
     AND coalesce(NEW.country,'') <> 'CA' THEN
    RAISE EXCEPTION 'Seller onboarding is currently available only for sellers based in Canada';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_seller_application_launch_country() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS seller_applications_launch_country ON public.seller_applications;
CREATE TRIGGER seller_applications_launch_country
BEFORE UPDATE OF status ON public.seller_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_seller_application_launch_country();