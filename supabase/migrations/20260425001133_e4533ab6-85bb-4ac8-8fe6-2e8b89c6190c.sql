-- =========================================================
-- Vendor Resource Center
-- =========================================================

-- Categories
CREATE TABLE public.resource_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resources (lessons)
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content TEXT,
  resource_type TEXT NOT NULL DEFAULT 'article', -- 'video' | 'article' | 'gallery'
  cover_image_url TEXT,
  video_url TEXT,
  video_provider TEXT, -- 'upload' | 'youtube' | 'vimeo'
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name,url,size}]
  tags TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'beginner', -- beginner|intermediate|advanced
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_category ON public.resources(category_id);
CREATE INDEX idx_resources_published ON public.resources(is_published) WHERE is_published = true;
CREATE INDEX idx_resources_featured ON public.resources(is_featured) WHERE is_featured = true;

-- Gallery images
CREATE TABLE public.resource_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resource_images_resource ON public.resource_images(resource_id);

-- Progress per user
CREATE TABLE public.resource_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'viewed', -- viewed | completed
  progress_percent INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);
CREATE INDEX idx_resource_progress_user ON public.resource_progress(user_id);

-- Feedback (helpful?)
CREATE TABLE public.resource_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_id, user_id)
);

-- updated_at triggers
CREATE TRIGGER resource_categories_updated_at
  BEFORE UPDATE ON public.resource_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View count RPC
CREATE OR REPLACE FUNCTION public.increment_resource_view(_resource_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resources SET view_count = view_count + 1 WHERE id = _resource_id;
END;
$$;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_feedback ENABLE ROW LEVEL SECURITY;

-- Helper: can manage resources?
CREATE OR REPLACE FUNCTION public.can_manage_resources(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_permission(_user_id, 'resources.manage');
$$;

-- Categories
CREATE POLICY "Public read active categories"
  ON public.resource_categories FOR SELECT
  TO anon, authenticated
  USING (is_active);

CREATE POLICY "Managers read all categories"
  ON public.resource_categories FOR SELECT
  TO authenticated
  USING (public.can_manage_resources(auth.uid()));

CREATE POLICY "Managers insert categories"
  ON public.resource_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_resources(auth.uid()));

CREATE POLICY "Managers update categories"
  ON public.resource_categories FOR UPDATE
  TO authenticated
  USING (public.can_manage_resources(auth.uid()))
  WITH CHECK (public.can_manage_resources(auth.uid()));

CREATE POLICY "Managers delete categories"
  ON public.resource_categories FOR DELETE
  TO authenticated
  USING (public.can_manage_resources(auth.uid()));

-- Resources
CREATE POLICY "Public read published resources"
  ON public.resources FOR SELECT
  TO anon, authenticated
  USING (is_published);

CREATE POLICY "Managers read all resources"
  ON public.resources FOR SELECT
  TO authenticated
  USING (public.can_manage_resources(auth.uid()));

CREATE POLICY "Managers insert resources"
  ON public.resources FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_resources(auth.uid()));

CREATE POLICY "Managers update resources"
  ON public.resources FOR UPDATE
  TO authenticated
  USING (public.can_manage_resources(auth.uid()))
  WITH CHECK (public.can_manage_resources(auth.uid()));

CREATE POLICY "Managers delete resources"
  ON public.resources FOR DELETE
  TO authenticated
  USING (public.can_manage_resources(auth.uid()));

-- Resource images
CREATE POLICY "Public read images of published resources"
  ON public.resource_images FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_images.resource_id AND r.is_published));

CREATE POLICY "Managers manage images"
  ON public.resource_images FOR ALL
  TO authenticated
  USING (public.can_manage_resources(auth.uid()))
  WITH CHECK (public.can_manage_resources(auth.uid()));

-- Progress (own only)
CREATE POLICY "Users read own progress"
  ON public.resource_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress"
  ON public.resource_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress"
  ON public.resource_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers read all progress"
  ON public.resource_progress FOR SELECT
  TO authenticated
  USING (public.can_manage_resources(auth.uid()));

-- Feedback
CREATE POLICY "Users read own feedback"
  ON public.resource_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own feedback"
  ON public.resource_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own feedback"
  ON public.resource_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers read all feedback"
  ON public.resource_feedback FOR SELECT
  TO authenticated
  USING (public.can_manage_resources(auth.uid()));

-- =========================================================
-- Storage bucket
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-resources', 'vendor-resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Vendor resources publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vendor-resources');

CREATE POLICY "Resource managers upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vendor-resources' AND public.can_manage_resources(auth.uid()));

CREATE POLICY "Resource managers update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vendor-resources' AND public.can_manage_resources(auth.uid()));

CREATE POLICY "Resource managers delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vendor-resources' AND public.can_manage_resources(auth.uid()));
