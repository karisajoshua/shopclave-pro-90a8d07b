CREATE OR REPLACE FUNCTION public.get_product_ratings(product_ids uuid[])
RETURNS TABLE(product_id uuid, avg_rating numeric, review_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.product_id,
         ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
         COUNT(*)::bigint AS review_count
  FROM public.reviews r
  WHERE r.product_id = ANY(product_ids)
  GROUP BY r.product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_ratings(uuid[]) TO anon, authenticated;