-- Create vendor_subscription_payments table
CREATE TABLE public.vendor_subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  max_listings INTEGER NOT NULL DEFAULT 5,
  expires_days INTEGER NOT NULL DEFAULT 30,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  transaction_code TEXT NOT NULL,
  payer_phone TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  admin_notes TEXT,
  subscription_id UUID REFERENCES public.vendor_subscriptions(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsp_vendor_id ON public.vendor_subscription_payments(vendor_id);
CREATE INDEX idx_vsp_status ON public.vendor_subscription_payments(status);

ALTER TABLE public.vendor_subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS: vendors can insert/select own
CREATE POLICY "Vendors can submit own payments"
ON public.vendor_subscription_payments
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()
));

CREATE POLICY "Vendors can view own payments"
ON public.vendor_subscription_payments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid()
));

-- RLS: admins can view and update all
CREATE POLICY "Admins can view all payments"
ON public.vendor_subscription_payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all payments"
ON public.vendor_subscription_payments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_vsp_updated_at
BEFORE UPDATE ON public.vendor_subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: on INSERT, auto-activate subscription and notify admins
CREATE OR REPLACE FUNCTION public.handle_new_subscription_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_sub_id UUID;
  _admin RECORD;
  _store_name TEXT;
BEGIN
  -- Expire any previously active subscriptions for this vendor
  UPDATE public.vendor_subscriptions
  SET status = 'expired'
  WHERE vendor_id = NEW.vendor_id AND status = 'active';

  -- Create new active subscription
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

  -- Link payment to the created subscription
  NEW.subscription_id := _new_sub_id;

  -- Get store name for notification
  SELECT store_name INTO _store_name FROM public.vendors WHERE id = NEW.vendor_id;

  -- Notify all admins
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (recipient_id, title, message, type)
    VALUES (
      _admin.user_id,
      'New Plan Payment Submitted',
      COALESCE(_store_name, 'A vendor') || ' submitted payment for ' || NEW.plan_name || ' plan (M-Pesa: ' || NEW.transaction_code || ')',
      'info'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_payment_insert
BEFORE INSERT ON public.vendor_subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_subscription_payment();

-- Trigger: on UPDATE to rejected, cancel linked subscription
CREATE OR REPLACE FUNCTION public.handle_subscription_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status <> 'rejected' AND NEW.subscription_id IS NOT NULL THEN
    UPDATE public.vendor_subscriptions
    SET status = 'cancelled'
    WHERE id = NEW.subscription_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_payment_status_change
AFTER UPDATE ON public.vendor_subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_payment_status_change();

-- Seed M-Pesa payment details
INSERT INTO public.platform_settings (key, value)
VALUES (
  'mpesa_payment_details',
  '{"till_number":"","paybill":"","account_name":"","phone":"","instructions":"Send the exact amount via M-Pesa, then enter your transaction code below."}'::jsonb
)
ON CONFLICT (key) DO NOTHING;