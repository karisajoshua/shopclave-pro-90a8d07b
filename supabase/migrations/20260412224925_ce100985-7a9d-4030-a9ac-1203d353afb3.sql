DROP POLICY "Vendors can update their order items" ON public.order_items;

CREATE POLICY "Vendors can update their order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.vendors
    WHERE vendors.id = order_items.vendor_id
      AND vendors.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vendors
    WHERE vendors.id = order_items.vendor_id
      AND vendors.user_id = auth.uid()
  )
);