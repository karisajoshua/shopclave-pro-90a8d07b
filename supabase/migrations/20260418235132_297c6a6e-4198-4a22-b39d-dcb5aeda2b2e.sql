-- Add slug column to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS slug text;

-- Slugify helper function
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(
    regexp_replace(lower(coalesce(_input, '')), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  ));
$$;

-- Backfill existing vendors with unique slugs
DO $$
DECLARE
  v RECORD;
  base_slug text;
  candidate text;
  suffix int;
BEGIN
  FOR v IN SELECT id, store_name FROM public.vendors WHERE slug IS NULL OR slug = '' LOOP
    base_slug := public.slugify(v.store_name);
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'store';
    END IF;
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM public.vendors WHERE slug = candidate AND id <> v.id) LOOP
      candidate := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    UPDATE public.vendors SET slug = candidate WHERE id = v.id;
  END LOOP;
END $$;

-- Unique index
CREATE UNIQUE INDEX IF NOT EXISTS vendors_slug_idx ON public.vendors(slug);

-- Trigger to auto-generate slug on INSERT when null
CREATE OR REPLACE FUNCTION public.vendors_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix int;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.slugify(NEW.store_name);
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'store';
    END IF;
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM public.vendors WHERE slug = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    NEW.slug := candidate;
  ELSE
    NEW.slug := public.slugify(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_set_slug_trigger ON public.vendors;
CREATE TRIGGER vendors_set_slug_trigger
BEFORE INSERT OR UPDATE OF slug, store_name ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.vendors_set_slug();