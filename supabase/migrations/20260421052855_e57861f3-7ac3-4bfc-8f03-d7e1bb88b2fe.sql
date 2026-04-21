
DROP POLICY IF EXISTS "Authenticated upload chat attachments" ON storage.objects;

CREATE POLICY "Users upload chat attachments to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
