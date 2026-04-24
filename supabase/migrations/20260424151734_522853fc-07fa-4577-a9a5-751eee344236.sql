-- 1. Create the bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Helper function: can the current user manage marketing assets?
CREATE OR REPLACE FUNCTION public.can_manage_marketing(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_permission(_user_id, 'marketing.manage');
$$;

-- 3. Storage RLS policies for marketing-assets
DROP POLICY IF EXISTS "Marketing assets publicly readable" ON storage.objects;
CREATE POLICY "Marketing assets publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-assets');

DROP POLICY IF EXISTS "Marketing managers can upload assets" ON storage.objects;
CREATE POLICY "Marketing managers can upload assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-assets'
    AND public.can_manage_marketing(auth.uid())
  );

DROP POLICY IF EXISTS "Marketing managers can update assets" ON storage.objects;
CREATE POLICY "Marketing managers can update assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND public.can_manage_marketing(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'marketing-assets'
    AND public.can_manage_marketing(auth.uid())
  );

DROP POLICY IF EXISTS "Marketing managers can delete assets" ON storage.objects;
CREATE POLICY "Marketing managers can delete assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'marketing-assets'
    AND public.can_manage_marketing(auth.uid())
  );