-- Hero banners table
CREATE TABLE public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  cta_label text,
  link_url text NOT NULL DEFAULT '/',
  desktop_image_url text NOT NULL,
  mobile_image_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('brand','product')),
  placement text NOT NULL CHECK (placement IN ('featured_brands','sponsored_products')),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  link_url text NOT NULL DEFAULT '/',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Public read of currently live banners/promotions
CREATE POLICY "Public can read live banners"
ON public.hero_banners
FOR SELECT
TO anon, authenticated
USING (
  is_active
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now())
);

CREATE POLICY "Public can read live promotions"
ON public.promotions
FOR SELECT
TO anon, authenticated
USING (
  is_active
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now())
);

-- Marketing managers (and super admins via has_permission fallback) manage rows
CREATE POLICY "Marketing can read all banners"
ON public.hero_banners
FOR SELECT
TO authenticated
USING (public.has_permission(auth.uid(), 'marketing.manage'));

CREATE POLICY "Marketing can insert banners"
ON public.hero_banners
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'marketing.manage'));

CREATE POLICY "Marketing can update banners"
ON public.hero_banners
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'marketing.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'marketing.manage'));

CREATE POLICY "Marketing can delete banners"
ON public.hero_banners
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'marketing.manage'));

CREATE POLICY "Marketing can read all promotions"
ON public.promotions
FOR SELECT
TO authenticated
USING (public.has_permission(auth.uid(), 'marketing.manage'));

CREATE POLICY "Marketing can insert promotions"
ON public.promotions
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'marketing.manage'));

CREATE POLICY "Marketing can update promotions"
ON public.promotions
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'marketing.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'marketing.manage'));

CREATE POLICY "Marketing can delete promotions"
ON public.promotions
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'marketing.manage'));

-- updated_at triggers
CREATE TRIGGER trg_hero_banners_updated_at
BEFORE UPDATE ON public.hero_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Marketing Manager team role
INSERT INTO public.team_roles (name, description, permissions, is_system)
VALUES (
  'Marketing Manager',
  'Manages homepage banners and brand/product promotions',
  ARRAY['dashboard.view', 'marketing.manage'],
  true
)
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;