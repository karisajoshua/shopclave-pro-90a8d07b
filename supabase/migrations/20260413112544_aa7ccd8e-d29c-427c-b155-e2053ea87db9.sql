
-- Convert whats_in_box from text to text[]
ALTER TABLE public.products
  ALTER COLUMN whats_in_box TYPE text[]
  USING CASE
    WHEN whats_in_box IS NOT NULL THEN ARRAY[whats_in_box]
    ELSE NULL
  END;
