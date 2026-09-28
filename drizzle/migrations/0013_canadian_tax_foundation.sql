-- Canadian sales tax foundation (GST/HST/PST/QST/RST), additive only.

CREATE TABLE public.tax_registrations (
  key text PRIMARY KEY,
  registration_number text,
  effective_from date NOT NULL,
  effective_to date,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text NOT NULL,
  component text NOT NULL CHECK (component IN ('GST','HST','PST','QST','RST')),
  rate_ppm integer NOT NULL CHECK (rate_ppm >= 0 AND rate_ppm <= 1000000),
  effective_from date NOT NULL,
  effective_to date,
  shipping_taxable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (province, component, effective_from)
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tax_category text NOT NULL DEFAULT 'taxable'
  CHECK (tax_category IN ('taxable','zero_rated','exempt','unknown'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_province text,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS tax_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS tax_engine_version text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS tax_category text,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS tax_breakdown jsonb;

CREATE TABLE public.order_tax_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  tax_point date NOT NULL,
  province text NOT NULL,
  request jsonb NOT NULL,
  result jsonb NOT NULL,
  engine_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

GRANT SELECT ON public.tax_registrations TO authenticated, anon;
GRANT SELECT ON public.tax_rates TO authenticated, anon;
GRANT SELECT ON public.order_tax_snapshots TO authenticated;
GRANT ALL ON public.tax_registrations TO service_role;
GRANT ALL ON public.tax_rates TO service_role;
GRANT ALL ON public.order_tax_snapshots TO service_role;

ALTER TABLE public.tax_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tax_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read registrations" ON public.tax_registrations FOR SELECT USING (true);
CREATE POLICY "Admins manage registrations" ON public.tax_registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Anyone can read rates" ON public.tax_rates FOR SELECT USING (true);
CREATE POLICY "Admins manage rates" ON public.tax_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Buyer or admin reads tax snapshot" ON public.order_tax_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE VIEW public.tax_remittance_report WITH (security_invoker = true) AS
SELECT date_trunc('month', o.created_at) AS period,
       o.tax_province AS province,
       c->>'component' AS component,
       SUM((c->>'baseCents')::bigint) AS base_cents,
       SUM((c->>'taxCents')::bigint) AS tax_cents
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(o.tax_breakdown->'components') c
WHERE o.payment_status = 'paid' AND o.tax_breakdown IS NOT NULL
GROUP BY 1, 2, 3;

GRANT SELECT ON public.tax_remittance_report TO authenticated;