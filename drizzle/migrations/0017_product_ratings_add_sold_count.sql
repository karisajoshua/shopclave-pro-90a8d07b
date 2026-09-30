-- Additive: extend get_product_ratings to also return real sold units (paid orders only).
-- Return-shape change requires drop+recreate; sole caller (useProductRatings) updated in the same release.
drop function if exists public.get_product_ratings(uuid[]);

create function public.get_product_ratings(product_ids uuid[])
returns table(product_id uuid, avg_rating numeric, review_count bigint, sold_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select product_id, round(avg(rating)::numeric, 2) as avg_rating, count(*)::bigint as review_count
    from public.reviews
    where product_id = any(product_ids)
    group by product_id
  ),
  s as (
    select oi.product_id, sum(oi.quantity)::bigint as sold_count
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.payment_status = 'paid'
      and oi.product_id = any(product_ids)
    group by oi.product_id
  )
  select coalesce(r.product_id, s.product_id) as product_id,
         coalesce(r.avg_rating, 0::numeric) as avg_rating,
         coalesce(r.review_count, 0::bigint) as review_count,
         coalesce(s.sold_count, 0::bigint) as sold_count
  from r
  full outer join s on s.product_id = r.product_id;
$$;

grant execute on function public.get_product_ratings(uuid[]) to anon, authenticated;