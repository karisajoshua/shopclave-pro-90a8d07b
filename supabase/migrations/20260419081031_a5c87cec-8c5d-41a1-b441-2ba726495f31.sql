
-- ============================================================================
-- SECURITY FIX 1: Restrict vendors.payment_details from anonymous users
-- Keep store contact info (phone, whatsapp, website) public — that's by design
-- for the classifieds marketplace model. Only payment_details (M-Pesa/bank)
-- needs to be limited to authenticated users (buyers viewing checkout).
-- ============================================================================

-- Drop the broad anonymous SELECT policy
DROP POLICY IF EXISTS "Anyone can view vendors" ON public.vendors;

-- Anon users can read non-sensitive vendor info (everything except payment_details)
-- We enforce this at the column level via a revoke + restricted re-grant.
REVOKE SELECT ON public.vendors FROM anon;
GRANT SELECT (
  id, user_id, store_name, store_description, logo_url, banner_url,
  status, slug, phone, phone2, whatsapp, website, created_at, updated_at, commission_rate
) ON public.vendors TO anon;

-- Authenticated users can see all vendor columns (needed for checkout payment_details)
-- They are gated by RLS so still need a SELECT policy.
CREATE POLICY "Authenticated users can view vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon SELECT (column-restricted via grants above) — needs an RLS policy too.
CREATE POLICY "Anon can view vendor public info"
  ON public.vendors FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- SECURITY FIX 2: Lock down storage product-images by vendor folder
-- Files must live under "vendors/{vendor_id}/..." and only that vendor's owner
-- (or an admin) may delete/update them. Reads remain public.
-- ============================================================================

DROP POLICY IF EXISTS "Vendors can delete own product images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can upload product images" ON storage.objects;

CREATE POLICY "Vendors can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'vendors'
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id::text = (storage.foldername(name))[2]
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'vendors'
    AND (
      EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id::text = (storage.foldername(name))[2]
          AND v.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

CREATE POLICY "Vendors can delete own product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'vendors'
    AND (
      EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id::text = (storage.foldername(name))[2]
          AND v.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- ============================================================================
-- SECURITY FIX 3: Reviews UPDATE — re-validate purchase on row change
-- Prevents users from swapping product_id post-insert to a product they
-- never purchased.
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.user_id = auth.uid()
        AND oi.product_id = reviews.product_id
        AND o.status = ANY (ARRAY['delivered', 'completed'])
    )
  );

-- ============================================================================
-- SECURITY FIX 4: vendor_follows — hide who follows whom
-- Replace public-readable rows with: owner can see own follows; aggregate
-- counts already exposed via SECURITY DEFINER function get_vendor_follower_count.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can count follows" ON public.vendor_follows;

CREATE POLICY "Users can view own follows"
  ON public.vendor_follows FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Vendor owners can view their followers"
  ON public.vendor_follows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = vendor_follows.vendor_id
        AND v.user_id = auth.uid()
    )
  );
