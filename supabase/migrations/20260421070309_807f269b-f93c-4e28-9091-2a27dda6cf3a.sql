-- Remove the failing cron job (no public Lovable Analytics API to call)
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-site-analytics-every-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Manually refresh cache with the latest analytics data (last 7 days, as of now)
UPDATE public.site_analytics_cache
SET
  updated_at = now(),
  data = jsonb_build_object(
    'refreshedAt', now(),
    'timeSeries', jsonb_build_object(
      'visitors', jsonb_build_object('total', 179, 'label', 'visitors', 'data', jsonb_build_array(
        jsonb_build_object('date', '2026-04-14', 'value', 22),
        jsonb_build_object('date', '2026-04-15', 'value', 21),
        jsonb_build_object('date', '2026-04-16', 'value', 19),
        jsonb_build_object('date', '2026-04-17', 'value', 28),
        jsonb_build_object('date', '2026-04-18', 'value', 25),
        jsonb_build_object('date', '2026-04-19', 'value', 24),
        jsonb_build_object('date', '2026-04-20', 'value', 32),
        jsonb_build_object('date', '2026-04-21', 'value', 8)
      )),
      'pageviews', jsonb_build_object('total', 1320, 'label', 'pageviews', 'data', jsonb_build_array(
        jsonb_build_object('date', '2026-04-14', 'value', 153),
        jsonb_build_object('date', '2026-04-15', 'value', 186),
        jsonb_build_object('date', '2026-04-16', 'value', 137),
        jsonb_build_object('date', '2026-04-17', 'value', 332),
        jsonb_build_object('date', '2026-04-18', 'value', 226),
        jsonb_build_object('date', '2026-04-19', 'value', 135),
        jsonb_build_object('date', '2026-04-20', 'value', 84),
        jsonb_build_object('date', '2026-04-21', 'value', 67)
      )),
      'pageviewsPerVisit', jsonb_build_object('total', 7.37, 'label', 'pageviewsPerVisit', 'data', jsonb_build_array(
        jsonb_build_object('date', '2026-04-14', 'value', 6.95),
        jsonb_build_object('date', '2026-04-15', 'value', 8.86),
        jsonb_build_object('date', '2026-04-16', 'value', 7.21),
        jsonb_build_object('date', '2026-04-17', 'value', 11.86),
        jsonb_build_object('date', '2026-04-18', 'value', 9.04),
        jsonb_build_object('date', '2026-04-19', 'value', 5.63),
        jsonb_build_object('date', '2026-04-20', 'value', 2.63),
        jsonb_build_object('date', '2026-04-21', 'value', 8.38)
      )),
      'sessionDuration', jsonb_build_object('total', 793, 'label', 'sessionDuration', 'data', jsonb_build_array(
        jsonb_build_object('date', '2026-04-14', 'value', 945.58),
        jsonb_build_object('date', '2026-04-15', 'value', 437.62),
        jsonb_build_object('date', '2026-04-16', 'value', 645.45),
        jsonb_build_object('date', '2026-04-17', 'value', 588.11),
        jsonb_build_object('date', '2026-04-18', 'value', 834.7),
        jsonb_build_object('date', '2026-04-19', 'value', 1813.43),
        jsonb_build_object('date', '2026-04-20', 'value', 745.67),
        jsonb_build_object('date', '2026-04-21', 'value', 331.09)
      )),
      'bounceRate', jsonb_build_object('total', 44, 'label', 'bounceRate', 'data', jsonb_build_array(
        jsonb_build_object('date', '2026-04-14', 'value', 45),
        jsonb_build_object('date', '2026-04-15', 'value', 33),
        jsonb_build_object('date', '2026-04-16', 'value', 37),
        jsonb_build_object('date', '2026-04-17', 'value', 39),
        jsonb_build_object('date', '2026-04-18', 'value', 44),
        jsonb_build_object('date', '2026-04-19', 'value', 33),
        jsonb_build_object('date', '2026-04-20', 'value', 59),
        jsonb_build_object('date', '2026-04-21', 'value', 63)
      ))
    ),
    'lists', jsonb_build_object(
      'page', jsonb_build_object('label', 'page', 'data', jsonb_build_array(
        jsonb_build_object('label', '/', 'value', 145),
        jsonb_build_object('label', '/search', 'value', 49),
        jsonb_build_object('label', '/vendor/dashboard', 'value', 41),
        jsonb_build_object('label', '/vendor/products', 'value', 31),
        jsonb_build_object('label', '/vendor/products/new', 'value', 22),
        jsonb_build_object('label', '/about', 'value', 18),
        jsonb_build_object('label', '/auth', 'value', 16),
        jsonb_build_object('label', '/cart', 'value', 14)
      )),
      'source', jsonb_build_object('label', 'source', 'data', jsonb_build_array(
        jsonb_build_object('label', 'Direct', 'value', 105),
        jsonb_build_object('label', 'google.com', 'value', 59),
        jsonb_build_object('label', 'accounts.google.com', 'value', 14),
        jsonb_build_object('label', 'm.facebook.com', 'value', 4),
        jsonb_build_object('label', 'facebook.com', 'value', 3),
        jsonb_build_object('label', 'lm.facebook.com', 'value', 1),
        jsonb_build_object('label', 'l.instagram.com', 'value', 1)
      )),
      'device', jsonb_build_object('label', 'device', 'data', jsonb_build_array(
        jsonb_build_object('label', 'mobile', 'value', 126),
        jsonb_build_object('label', 'desktop', 'value', 48)
      )),
      'country', jsonb_build_object('label', 'country', 'data', jsonb_build_array(
        jsonb_build_object('label', 'KE', 'value', 99),
        jsonb_build_object('label', 'CA', 'value', 28),
        jsonb_build_object('label', 'Unknown', 'value', 20),
        jsonb_build_object('label', 'US', 'value', 14),
        jsonb_build_object('label', 'SO', 'value', 6),
        jsonb_build_object('label', 'TZ', 'value', 3),
        jsonb_build_object('label', 'IN', 'value', 2)
      ))
    )
  )
WHERE id = 1;