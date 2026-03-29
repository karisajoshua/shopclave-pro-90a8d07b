
-- Fix 1: Restrict public product visibility to active products only
DROP POLICY IF EXISTS "Active products viewable by everyone" ON public.products;
CREATE POLICY "Active products viewable by everyone"
  ON public.products FOR SELECT TO public
  USING (status = 'active');

-- Fix 2: Require purchase verification for reviews + unique constraint
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Only purchasers can review"
  ON public.reviews FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = auth.uid()
        AND oi.product_id = reviews.product_id
        AND o.status IN ('delivered', 'completed')
    )
  );

ALTER TABLE public.reviews ADD CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id);
