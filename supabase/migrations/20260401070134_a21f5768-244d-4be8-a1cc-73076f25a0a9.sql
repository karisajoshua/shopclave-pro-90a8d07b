CREATE TABLE public.vendor_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);

ALTER TABLE public.vendor_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can count follows" ON public.vendor_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow vendors" ON public.vendor_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow" ON public.vendor_follows
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_vendor_follower_count(v_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.vendor_follows WHERE vendor_id = v_id;
$$;