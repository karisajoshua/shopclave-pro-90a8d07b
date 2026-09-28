-- Internal pricing/tax config: server functions use the service role; admins keep their ALL policies.
DROP POLICY IF EXISTS "Anyone can read registrations" ON public.tax_registrations;
DROP POLICY IF EXISTS "Anyone can read rates" ON public.tax_rates;
DROP POLICY IF EXISTS "Fee settings viewable by everyone" ON public.platform_fee_settings;
DROP POLICY IF EXISTS "Commission rates viewable by everyone" ON public.category_commission_rates;

-- Analytics events: only known event types for an existing product of that vendor.
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.vendor_analytics;
CREATE POLICY "Anyone can insert valid analytics events" ON public.vendor_analytics
FOR INSERT TO anon, authenticated
WITH CHECK (
  event_type IN ('view','call_click','whatsapp_click','website_click')
  AND product_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.vendor_id = vendor_analytics.vendor_id)
);

-- Cookie consent: no spoofing other users, bounded session id, essential always true.
DROP POLICY IF EXISTS "Anyone can log consent" ON public.cookie_consents;
CREATE POLICY "Anyone can log own consent" ON public.cookie_consents
FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND length(session_id) BETWEEN 1 AND 128
  AND essential = true
  AND ip_country IS NULL
);

-- Public buckets serve files via public URLs without SELECT policies; drop listing access.
DROP POLICY IF EXISTS "Email assets publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Vendor resources publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Marketing assets publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Product images publicly accessible" ON storage.objects;