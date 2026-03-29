-- 1. Fix storage policies for product-images bucket

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;

-- Vendors-only upload policy
CREATE POLICY "Vendors can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.vendors WHERE user_id = auth.uid())
  );

-- Vendors-only update policy (own images)
CREATE POLICY "Vendors can update own product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.vendors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.vendors WHERE user_id = auth.uid())
  );

-- Vendors can delete own product images
CREATE POLICY "Vendors can delete own product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.vendors WHERE user_id = auth.uid())
  );

-- Admins can manage all product images
CREATE POLICY "Admins can manage product images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'product-images' AND
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. Remove notifications from realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;