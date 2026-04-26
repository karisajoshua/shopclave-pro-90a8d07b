-- Social Media (Ocoya) settings — single-row config table
CREATE TABLE public.social_media_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT,
  workspace_name TEXT,
  last_synced_at TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins with social_media.manage can view settings"
ON public.social_media_settings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.has_permission(auth.uid(), 'social_media.manage')
);

CREATE POLICY "Admins with social_media.manage can insert settings"
ON public.social_media_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.has_permission(auth.uid(), 'social_media.manage')
);

CREATE POLICY "Admins with social_media.manage can update settings"
ON public.social_media_settings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.has_permission(auth.uid(), 'social_media.manage')
);

CREATE TRIGGER update_social_media_settings_updated_at
BEFORE UPDATE ON public.social_media_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log of admin social media actions (written by edge function via service role)
CREATE TABLE public.social_media_post_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  ocoya_post_id TEXT,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_post_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view social media post logs"
ON public.social_media_post_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_social_media_post_log_created_at
  ON public.social_media_post_log (created_at DESC);
CREATE INDEX idx_social_media_post_log_user_id
  ON public.social_media_post_log (user_id);