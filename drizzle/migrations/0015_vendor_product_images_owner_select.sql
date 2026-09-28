CREATE POLICY "Vendors can read own product image objects" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'vendors'
  AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id::text = (storage.foldername(name))[2] AND v.user_id = auth.uid())
);