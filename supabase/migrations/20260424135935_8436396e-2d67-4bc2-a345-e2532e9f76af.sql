-- Fix vendor subscription activation flow: only activate after admin approval

-- 1. Rewrite INSERT trigger function: notify admins only, do NOT activate plan
CREATE OR REPLACE FUNCTION public.handle_new_subscription_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin RECORD;
  _store_name TEXT;
BEGIN
  -- Get store name for notification
  SELECT store_name INTO _store_name FROM public.vendors WHERE id = NEW.vendor_id;

  -- Notify all admins that a new payment is awaiting verification
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (recipient_id, title, message, type)
    VALUES (
      _admin.user_id,
      'New Plan Payment Submitted',
      COALESCE(_store_name, 'A vendor') || ' submitted payment for ' || NEW.plan_name || ' plan (M-Pesa: ' || NEW.transaction_code || '). Awaiting verification.',
      'info'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2. Rewrite status-change trigger function: activate plan on verification
CREATE OR REPLACE FUNCTION public.handle_subscription_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_sub_id UUID;
  _store_name TEXT;
BEGIN
  -- When admin verifies the payment: expire current active sub, create new active sub
  IF NEW.status = 'verified' AND OLD.status <> 'verified' THEN
    -- Expire any previously active subscriptions for this vendor
    UPDATE public.vendor_subscriptions
    SET status = 'expired'
    WHERE vendor_id = NEW.vendor_id AND status = 'active';

    -- Create the new active subscription
    INSERT INTO public.vendor_subscriptions (
      vendor_id, plan_name, max_listings, price, status, started_at, expires_at
    ) VALUES (
      NEW.vendor_id,
      NEW.plan_name,
      NEW.max_listings,
      NEW.price,
      'active',
      now(),
      now() + (NEW.expires_days || ' days')::interval
    ) RETURNING id INTO _new_sub_id;

    -- Link payment to the newly created subscription
    NEW.subscription_id := _new_sub_id;

    -- Notify the vendor that their plan is active
    SELECT store_name INTO _store_name FROM public.vendors WHERE id = NEW.vendor_id;
    INSERT INTO public.notifications (recipient_id, title, message, type)
    SELECT v.user_id,
           'Plan Activated',
           'Your ' || NEW.plan_name || ' plan has been verified and is now active.',
           'success'
    FROM public.vendors v
    WHERE v.id = NEW.vendor_id;

  -- When admin rejects the payment, notify vendor (no sub to cancel since none was created on submission)
  ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    INSERT INTO public.notifications (recipient_id, title, message, type)
    SELECT v.user_id,
           'Plan Payment Rejected',
           'Your payment for the ' || NEW.plan_name || ' plan was rejected.' ||
             COALESCE(' Reason: ' || NEW.admin_notes, ''),
           'warning'
    FROM public.vendors v
    WHERE v.id = NEW.vendor_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. The status-change trigger needs to write to NEW.subscription_id, so it must be BEFORE UPDATE.
-- Drop existing AFTER UPDATE trigger and recreate as BEFORE UPDATE.
DROP TRIGGER IF EXISTS on_subscription_payment_status_change ON public.vendor_subscription_payments;

CREATE TRIGGER on_subscription_payment_status_change
BEFORE UPDATE ON public.vendor_subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_payment_status_change();

-- 4. One-time cleanup: cancel any vendor_subscriptions that were auto-activated under
-- the old behavior but whose linked payment is still pending_verification.
UPDATE public.vendor_subscriptions vs
SET status = 'cancelled'
WHERE vs.status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.vendor_subscription_payments p
    WHERE p.subscription_id = vs.id
      AND p.status = 'pending_verification'
  );