CREATE OR REPLACE FUNCTION public.get_category_ancestors(_category_id uuid)
RETURNS TABLE(id uuid, name text, slug text, parent_id uuid, depth int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH RECURSIVE chain AS (
    SELECT c.id, c.name, c.slug, c.parent_id, 0 AS depth
    FROM public.categories c WHERE c.id = _category_id
    UNION ALL
    SELECT c.id, c.name, c.slug, c.parent_id, chain.depth + 1
    FROM public.categories c JOIN chain ON c.id = chain.parent_id
  )
  SELECT id, name, slug, parent_id, depth FROM chain ORDER BY depth DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_category_ancestors(uuid) TO anon, authenticated, service_role;