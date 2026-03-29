-- Create product_variants table
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_options jsonb NOT NULL DEFAULT '{}',
  price numeric,
  stock integer NOT NULL DEFAULT 0,
  sku text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Everyone can view variants
CREATE POLICY "Variants viewable by everyone"
  ON public.product_variants FOR SELECT
  TO public USING (true);

-- Vendors can manage their own product variants
CREATE POLICY "Vendors can manage own variants"
  ON public.product_variants FOR ALL
  TO public USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = product_variants.product_id
        AND v.user_id = auth.uid()
    )
  );

-- Admins can manage all variants
CREATE POLICY "Admins can manage all variants"
  ON public.product_variants FOR ALL
  TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Add variant columns to order_items
ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id),
  ADD COLUMN variant_options jsonb;