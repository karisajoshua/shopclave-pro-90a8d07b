-- Isolated PostgreSQL integration fixture. Never execute against production.
CREATE SCHEMA IF NOT EXISTS public;
CREATE TABLE public.orders (
 id uuid PRIMARY KEY, user_id uuid NOT NULL, status text NOT NULL,
 shipping_total numeric(12,2), dap_acknowledged_at timestamptz
);
CREATE TABLE public.order_items (
 id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.orders(id),
 vendor_id uuid NOT NULL
);
CREATE TABLE public.international_quotes (
 id uuid PRIMARY KEY, user_id uuid NOT NULL, vendor_id uuid NOT NULL,
 destination_country text NOT NULL, address_fingerprint text NOT NULL,
 items_fingerprint text NOT NULL, parcel_fingerprint text NOT NULL,
 consumed_order_id uuid, expires_at timestamptz NOT NULL,
 verified boolean NOT NULL, source text NOT NULL, mode text NOT NULL,
 shipping_cad numeric(12,2) NOT NULL, customs_fee_cad numeric(12,2),
 duties_cad numeric(12,2), import_tax_cad numeric(12,2)
);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  CREATE ROLE service_role NOLOGIN;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  CREATE ROLE authenticated NOLOGIN;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  CREATE ROLE anon NOLOGIN;
 END IF;
END $$;
