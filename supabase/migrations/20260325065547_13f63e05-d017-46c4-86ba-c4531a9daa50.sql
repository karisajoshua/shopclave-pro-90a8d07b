
-- Allow vendors to delete their own products (needed for dashboard delete button)
CREATE POLICY "Vendors can delete own products"
ON public.products
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM vendors WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid()
));

-- Allow vendors to delete product images for their products
CREATE POLICY "Vendors can delete own product images"
ON public.product_images
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM products p JOIN vendors v ON p.vendor_id = v.id
  WHERE p.id = product_images.product_id AND v.user_id = auth.uid()
));
