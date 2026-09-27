-- DEVELOPMENT DRAFT. Only admins may verify an independently inspected upload.
CREATE OR REPLACE FUNCTION public.review_seller_document(
 p_document_id uuid,p_decision text,p_reason text
) RETURNS public.seller_verification_documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE d public.seller_verification_documents;
 a public.seller_applications;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=(SELECT auth.uid()) AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_decision NOT IN ('verified','rejected') OR nullif(btrim(p_reason),'') IS NULL
 THEN RAISE EXCEPTION 'Decision and evidence note required'; END IF;
 SELECT * INTO d FROM public.seller_verification_documents WHERE id=p_document_id FOR UPDATE;
 IF d.id IS NULL OR d.verification_status<>'pending'
 THEN RAISE EXCEPTION 'Document not pending review'; END IF;
 SELECT * INTO a FROM public.seller_applications WHERE id=d.application_id FOR UPDATE;
 IF a.status NOT IN ('submitted','under_review') THEN
  RAISE EXCEPTION 'Application is not reviewable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.seller_document_access_events e
  WHERE e.document_id=d.id AND e.reviewer_id=(SELECT auth.uid())
  AND e.accessed_at>now()-interval '24 hours')
 THEN RAISE EXCEPTION 'Review the private document before deciding'; END IF;
 UPDATE public.seller_verification_documents SET verification_status=p_decision,reviewed_at=now()
 WHERE id=d.id RETURNING * INTO d;
 INSERT INTO public.seller_application_events(application_id,actor_id,previous_status,new_status,reason)
 VALUES(a.id,(SELECT auth.uid()),'document:pending','document:'||p_decision,
 'Document '||d.requirement_code||': '||left(p_reason,500));
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.review_seller_document(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_seller_document(uuid,text,text) TO authenticated;
