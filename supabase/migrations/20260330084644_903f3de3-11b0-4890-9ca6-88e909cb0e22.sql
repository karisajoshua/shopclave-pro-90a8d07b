CREATE TABLE public.site_analytics_cache (
  id integer PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics cache"
ON public.site_analytics_cache
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage analytics cache"
ON public.site_analytics_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);