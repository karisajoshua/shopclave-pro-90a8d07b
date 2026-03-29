
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by everyone" ON public.platform_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.platform_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (key, value) VALUES
  ('default_commission_rate', '"10"'),
  ('platform_name', '"Barakaz"'),
  ('support_email', '"support@barakaz.com"'),
  ('currency', '"KES"'),
  ('min_order_amount', '"0"'),
  ('free_shipping_threshold', '"5000"'),
  ('vendor_auto_approve', '"false"'),
  ('maintenance_mode', '"false"');

-- Seed Automotive category
INSERT INTO public.categories (name, slug, image_url) VALUES
  ('Automotive', 'automotive', null);

INSERT INTO public.categories (name, slug, parent_id, image_url) VALUES
  ('Car Parts', 'car-parts', (SELECT id FROM public.categories WHERE slug = 'automotive'), null),
  ('Tires & Wheels', 'tires-wheels', (SELECT id FROM public.categories WHERE slug = 'automotive'), null),
  ('Car Electronics', 'car-electronics', (SELECT id FROM public.categories WHERE slug = 'automotive'), null),
  ('Interior Accessories', 'interior-accessories', (SELECT id FROM public.categories WHERE slug = 'automotive'), null),
  ('Exterior Accessories', 'exterior-accessories', (SELECT id FROM public.categories WHERE slug = 'automotive'), null),
  ('Oils & Fluids', 'oils-fluids', (SELECT id FROM public.categories WHERE slug = 'automotive'), null),
  ('Tools & Equipment', 'tools-equipment', (SELECT id FROM public.categories WHERE slug = 'automotive'), null),
  ('Motorcycle Parts', 'motorcycle-parts', (SELECT id FROM public.categories WHERE slug = 'automotive'), null);
