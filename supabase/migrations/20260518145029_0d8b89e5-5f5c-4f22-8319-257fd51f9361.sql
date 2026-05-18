CREATE TABLE public.user_locations (
  user_id uuid PRIMARY KEY,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own location"
ON public.user_locations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all locations"
ON public.user_locations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_user_locations_updated_at ON public.user_locations(updated_at DESC);