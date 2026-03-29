
-- Restrict platform_settings SELECT to admins only
DROP POLICY IF EXISTS "Settings readable by authenticated" ON public.platform_settings;
CREATE POLICY "Settings readable by admins only"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
