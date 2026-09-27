-- DEVELOPMENT DRAFT ONLY. Review deployed schema and RLS before applying.
-- Existing vendor records and approval statuses remain unchanged.
CREATE TABLE IF NOT EXISTS public.seller_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 vendor_id uuid UNIQUE REFERENCES public.vendors(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','under_review','more_information_required','approved','rejected')),
 current_step smallint NOT NULL DEFAULT 1 CHECK(current_step BETWEEN 1 AND 6),
 country text CHECK(country IS NULL OR country ~ '^[A-Z]{2}$'),
 business_type text CHECK(business_type IS NULL OR business_type IN ('individual','sole_proprietor','company')),
 business_info jsonb NOT NULL DEFAULT '{}'::jsonb,
 store_info jsonb NOT NULL DEFAULT '{}'::jsonb,
 submitted_at timestamptz, reviewed_at timestamptz,
 reviewed_by uuid REFERENCES auth.users(id), review_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.seller_agreement_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.seller_applications(id) ON DELETE CASCADE,
 policy_code text NOT NULL, policy_version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 accepted_by uuid NOT NULL REFERENCES auth.users(id),
 UNIQUE(application_id,policy_code,policy_version)
);
CREATE TABLE IF NOT EXISTS public.seller_application_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.seller_applications(id),
 actor_id uuid REFERENCES auth.users(id),
 previous_status text, new_status text NOT NULL,
 reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.seller_payout_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.seller_applications(id),
 provider text NOT NULL, provider_account_id text,
 country text NOT NULL, currency text,
 verification_status text NOT NULL DEFAULT 'not_started'
 CHECK(verification_status IN ('not_started','pending','action_required','verified','restricted','disabled')),
 charges_enabled boolean NOT NULL DEFAULT false,
 payouts_enabled boolean NOT NULL DEFAULT false,
 last_webhook_at timestamptz,
 UNIQUE(application_id,provider)
);
CREATE TABLE IF NOT EXISTS public.seller_verification_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.seller_applications(id) ON DELETE CASCADE,
 requirement_code text NOT NULL, private_storage_path text NOT NULL,
 verification_status text NOT NULL DEFAULT 'pending',
 uploaded_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS seller_applications_review_queue ON public.seller_applications(status,submitted_at DESC);
CREATE INDEX IF NOT EXISTS seller_events_application_time ON public.seller_application_events(application_id,created_at DESC);
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verification_documents ENABLE ROW LEVEL SECURITY;
-- Only own drafts may be edited by clients. Approval and submitted states
-- must be changed by separately reviewed privileged RPCs, never generic UPDATE.
CREATE POLICY seller_application_owner_read ON public.seller_applications FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE POLICY seller_application_owner_create ON public.seller_applications FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()) AND status='draft' AND vendor_id IS NULL
 AND reviewed_by IS NULL AND reviewed_at IS NULL AND submitted_at IS NULL);
-- Deliberately no client UPDATE policy until a field-limited autosave RPC exists.
-- Deliberately no public document, payout or audit policies.
