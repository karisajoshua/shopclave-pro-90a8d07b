ALTER TABLE public.site_analytics_cache REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_analytics_cache;