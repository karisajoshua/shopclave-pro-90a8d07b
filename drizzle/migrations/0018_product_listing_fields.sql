ALTER TABLE public.products
 ADD COLUMN IF NOT EXISTS brand text,
 ADD COLUMN IF NOT EXISTS mpn text,
 ADD COLUMN IF NOT EXISTS barcode text,
 ADD COLUMN IF NOT EXISTS cost_per_item numeric,
 ADD COLUMN IF NOT EXISTS low_stock_threshold integer,
 ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS allow_backorders boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS min_order_qty integer NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS max_order_qty integer,
 ADD COLUMN IF NOT EXISTS shipping_options jsonb NOT NULL DEFAULT '{"standard":{"enabled":true,"days":"3-7","price":12.5},"express":{"enabled":true,"days":"1-3","price":19.99},"free":{"enabled":false,"days":"3-7","price":0},"pickup":{"enabled":false,"days":"1-2","price":0}}'::jsonb;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode text;