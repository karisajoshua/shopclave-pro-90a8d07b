CREATE TABLE public.short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_short_links_code ON public.short_links(code);
CREATE INDEX idx_short_links_created_by ON public.short_links(created_by);
CREATE INDEX idx_short_links_target_url ON public.short_links(target_url);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Short links are publicly readable"
ON public.short_links FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create short links"
ON public.short_links FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update short links"
ON public.short_links FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete short links"
ON public.short_links FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.increment_short_link_click(_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.short_links
  SET click_count = click_count + 1
  WHERE code = _code;
END;
$$;