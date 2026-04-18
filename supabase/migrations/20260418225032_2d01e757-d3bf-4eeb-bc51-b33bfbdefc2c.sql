-- Create vendor_uploads table for standalone image uploads
CREATE TABLE public.vendor_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vendor_id UUID,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own uploads"
  ON public.vendor_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can view uploads"
  ON public.vendor_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can update uploads"
  ON public.vendor_uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete uploads"
  ON public.vendor_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_vendor_uploads_user_id ON public.vendor_uploads(user_id);
CREATE INDEX idx_vendor_uploads_created_at ON public.vendor_uploads(created_at DESC);

-- Storage policy: allow authenticated users to upload to product-images bucket under uploads/{user_id}/
CREATE POLICY "Users can upload to own uploads folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete from own uploads folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'uploads'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role))
  );