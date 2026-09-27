-- DEVELOPMENT DRAFT. Immutable audit of privileged document access.
CREATE TABLE IF NOT EXISTS public.seller_document_access_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 document_id uuid NOT NULL REFERENCES public.seller_verification_documents(id),
 reviewer_id uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL CHECK(action IN ('signed_url_issued')),
 accessed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_document_access_events ENABLE ROW LEVEL SECURITY;
-- No browser write or read policies. Service-only audited access.
