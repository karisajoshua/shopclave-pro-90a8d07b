-- DEVELOPMENT DRAFT. Server-side webhook idempotency only.
CREATE TABLE IF NOT EXISTS public.seller_stripe_webhook_events (
 event_id text PRIMARY KEY,
 account_id text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No client access. Service-role Edge Function only.
