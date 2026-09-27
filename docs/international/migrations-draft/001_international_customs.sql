-- DRAFT ONLY. NOT APPLIED. Review before any migration.
-- Existing products columns reused: hs_code, ships_from_country, customs_value_cad,
-- weight_g, length_cm, width_cm, height_cm, international_shipping_enabled.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS country_of_manufacture text
  CHECK (country_of_manufacture IS NULL OR country_of_manufacture ~ '^[A-Z]{2}$');

CREATE TABLE IF NOT EXISTS public.international_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  mode text NOT NULL CHECK (mode IN ('DDP','DAP')),
  source text NOT NULL CHECK (source IN ('shippo','dhl_express','zonos','manual_admin')),
  verified boolean NOT NULL DEFAULT false,
  origin_country text NOT NULL,
  destination_country text NOT NULL,
  shipping_cad numeric(12,2) NOT NULL CHECK (shipping_cad >= 0),
  duties_cad numeric(12,2),
  import_tax_cad numeric(12,2),
  customs_fee_cad numeric(12,2),
  provider_currency text NOT NULL,
  provider_amount numeric(12,2),
  fx_rate_to_cad numeric NOT NULL,
  parcel jsonb NOT NULL,
  customs_lines jsonb NOT NULL,
  address_fingerprint text NOT NULL,
  items_fingerprint text NOT NULL,
  parcel_fingerprint text NOT NULL,
  rate_id text,
  consumed_order_id uuid REFERENCES public.orders(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (mode <> 'DDP' OR (duties_cad IS NOT NULL AND import_tax_cad IS NOT NULL))
);
GRANT SELECT ON public.international_quotes TO authenticated;
GRANT ALL ON public.international_quotes TO service_role;
ALTER TABLE public.international_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own international quotes" ON public.international_quotes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Writes only via service_role Edge Functions after verified provider responses.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dap_acknowledged_at timestamptz;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS incoterm text CHECK (incoterm IN ('DDP','DAP'));

-- Gate row (fail closed): platform_settings key 'international_gate'
-- value {"enabled":false,"carrierIntegrationVerified":false,"landedCostIntegrationVerified":false,"exportTaxRulesVerified":false}
