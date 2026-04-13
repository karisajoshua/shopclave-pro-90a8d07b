CREATE POLICY "Anyone can view vendors"
ON public.vendors
FOR SELECT
TO anon, authenticated
USING (true);