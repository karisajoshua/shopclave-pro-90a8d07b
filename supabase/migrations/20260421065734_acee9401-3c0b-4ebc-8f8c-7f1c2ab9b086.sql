-- Schedule the refresh-site-analytics edge function to run every 5 minutes
-- so admin Site Analytics always shows fresh data.

-- Remove any old job if present
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-site-analytics-every-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'refresh-site-analytics-every-5min',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://fyfeyolecqnpriwjgzyo.supabase.co/functions/v1/refresh-site-analytics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $cron$
);

-- Trigger an immediate first run so the cache is fresh right away
SELECT net.http_post(
  url := 'https://fyfeyolecqnpriwjgzyo.supabase.co/functions/v1/refresh-site-analytics',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object('source', 'initial')
);