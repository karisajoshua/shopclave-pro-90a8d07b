
-- Add payment_details column to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS payment_details jsonb DEFAULT '{}';

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  sender_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast conversation lookups
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_vendor ON public.chat_messages(vendor_id);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their own conversations (where they are sender or the other party)
CREATE POLICY "Users can view own conversation messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR conversation_id LIKE auth.uid()::text || '_%'
  OR conversation_id LIKE '%_' || auth.uid()::text
);

-- Users can send messages (insert) in conversations they are part of
CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
);

-- Vendors can view messages sent to their vendor account
CREATE POLICY "Vendors can view their vendor messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = chat_messages.vendor_id
    AND vendors.user_id = auth.uid()
  )
);

-- Users can mark messages as read in their conversations
CREATE POLICY "Users can update read status"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id
  OR EXISTS (
    SELECT 1 FROM public.vendors
    WHERE vendors.id = chat_messages.vendor_id
    AND vendors.user_id = auth.uid()
  )
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
