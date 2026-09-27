-- DEVELOPMENT DRAFT: private KYC storage and owner-scoped uploads.
-- Review storage schema and retention requirements before applying.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('seller-kyc-private','seller-kyc-private',false,10485760,
 ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT(id) DO NOTHING;
-- Object key convention: <auth-user-uuid>/<application-uuid>/<random-filename>
CREATE POLICY seller_kyc_owner_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='seller-kyc-private'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND EXISTS(SELECT 1 FROM public.seller_applications a
 WHERE a.id::text=(storage.foldername(name))[2]
 AND a.user_id=(SELECT auth.uid()) AND a.status='draft'));
-- No browser SELECT or DELETE policy. Reviewers access via audited service
-- endpoint that issues short-lived signed URLs, never through public storage.
-- Production must implement upload confirmation, malware scanning,
-- document retention and a reviewer evidence trail before enabling.
