CREATE TABLE public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  preferences boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  ip_country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log consent" ON public.cookie_consents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view consents" ON public.cookie_consents
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));