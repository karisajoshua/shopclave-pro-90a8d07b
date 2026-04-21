
-- Allow participants to SELECT order-linked messages (including system messages)
CREATE POLICY "Participants view order-linked messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    order_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = chat_messages.order_id AND o.user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.vendors v ON v.id = oi.vendor_id
        WHERE oi.order_id = chat_messages.order_id AND v.user_id = auth.uid()
      )
    )
  );

-- Block direct UPDATE when an open dispute exists (RPCs use SECURITY DEFINER and bypass)
DROP POLICY IF EXISTS "Participants update soft-delete and seen" ON public.chat_messages;
CREATE POLICY "Participants update soft-delete and seen"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    (
      auth.uid() = sender_id
      OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = chat_messages.vendor_id AND v.user_id = auth.uid())
    )
    AND (order_id IS NULL OR NOT public.order_has_open_dispute(order_id))
  )
  WITH CHECK (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = chat_messages.vendor_id AND v.user_id = auth.uid())
  );
