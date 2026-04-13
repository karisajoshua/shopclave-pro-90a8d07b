
-- Add new columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS key_features text[],
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS whats_in_box text;

-- Backfill SKUs for existing products
UPDATE public.products
SET sku = 'SKU-' || upper(left(regexp_replace(name, '[^a-zA-Z]', '', 'g'), 3)) || '-' || upper(substr(md5(id::text), 1, 5))
WHERE sku IS NULL;
