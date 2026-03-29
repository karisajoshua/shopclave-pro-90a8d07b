-- Fix: Block direct inserts into orders table.
-- Orders are created via the create-order edge function using service_role (which bypasses RLS).
-- This policy ensures no client-side insert is possible.
CREATE POLICY "Only service role can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (false);