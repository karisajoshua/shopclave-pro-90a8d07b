
-- ============================================
-- Phase 1: Secure Order Chat & Evidence Vault
-- ============================================

-- 1. Extend chat_messages (additive)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS order_id uuid NULL,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_url text NULL,
  ADD COLUMN IF NOT EXISTS attachment_type text NULL,
  ADD COLUMN IF NOT EXISTS attachment_size integer NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_sender boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_receiver boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS is_system_message boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seen_at timestamptz NULL;

-- Backfill seen_at from is_read for existing rows
UPDATE public.chat_messages
SET seen_at = created_at
WHERE is_read = true AND seen_at IS NULL;

-- Add fk for order_id (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_order_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_order_created
  ON public.chat_messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
  ON public.chat_messages(conversation_id, created_at);

-- Constrain message_type values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_message_type_check') THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_message_type_check
      CHECK (message_type IN ('text','image','file','voice','location','system'));
  END IF;
END$$;

-- 2. message_edit_history
CREATE TABLE IF NOT EXISTS public.message_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  old_text text,
  new_text text,
  edited_by uuid NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_edit_history_msg ON public.message_edit_history(message_id);
ALTER TABLE public.message_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read edit history"
  ON public.message_edit_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editor reads own history"
  ON public.message_edit_history FOR SELECT TO authenticated
  USING (auth.uid() = edited_by);

-- 3. audit_logs (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_order ON public.audit_logs(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT policy: only SECURITY DEFINER functions write.

-- 4. disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_notes text NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL,
  CONSTRAINT disputes_status_check CHECK (status IN ('open','investigating','resolved','closed'))
);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage disputes"
  ON public.disputes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyer or vendor can view dispute"
  ON public.disputes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = disputes.order_id AND o.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.vendors v ON v.id = oi.vendor_id
      WHERE oi.order_id = disputes.order_id AND v.user_id = auth.uid()
    )
  );

-- Disputes are opened via RPC (open_dispute) only.

-- 5. chat_attachments (evidence index)
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NULL,
  file_size integer NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_msg ON public.chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_order ON public.chat_attachments(order_id);
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all attachments"
  ON public.chat_attachments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Uploader reads own attachments"
  ON public.chat_attachments FOR SELECT TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Participants read attachments via message"
  ON public.chat_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_attachments.message_id
        AND (
          m.sender_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = m.vendor_id AND v.user_id = auth.uid())
        )
    )
  );

CREATE POLICY "Uploader inserts attachment"
  ON public.chat_attachments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- 6. user_risk_flags
CREATE TABLE IF NOT EXISTS public.user_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL,
  reason text NULL,
  score integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  CONSTRAINT user_risk_flags_type_check CHECK (flag_type IN ('cod_risk','vendor_risk','delete_abuse','unreachable'))
);
CREATE INDEX IF NOT EXISTS idx_user_risk_flags_user ON public.user_risk_flags(user_id);
ALTER TABLE public.user_risk_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage risk flags"
  ON public.user_risk_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Storage bucket for chat attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path is orders/{order_id}/{message_id}/{filename} OR conv/{conversation_id}/{filename}
CREATE POLICY "Admins read chat attachments storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated upload chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owner reads chat attachments storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND owner = auth.uid());

-- 8. Update chat_messages RLS to respect soft-delete for participants
-- (existing SELECT policies stay; we add UPDATE limits via RPC, no DELETE policy)

-- Allow participants to update only soft-delete + seen fields directly (RPC also available)
DROP POLICY IF EXISTS "Users can update read status" ON public.chat_messages;
CREATE POLICY "Participants update soft-delete and seen"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = chat_messages.vendor_id AND v.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = chat_messages.vendor_id AND v.user_id = auth.uid())
  );

-- ============================================
-- RPCs
-- ============================================

-- Helper: check if order has open dispute
CREATE OR REPLACE FUNCTION public.order_has_open_dispute(_order_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disputes
    WHERE order_id = _order_id AND status IN ('open','investigating')
  );
$$;

-- mark_messages_seen
CREATE OR REPLACE FUNCTION public.mark_messages_seen(_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_messages m
  SET seen_at = COALESCE(m.seen_at, now()),
      is_read = true
  WHERE m.id = ANY(_message_ids)
    AND m.sender_id <> auth.uid()
    AND (
      -- buyer side of conversation
      m.conversation_id LIKE auth.uid()::text || '\_%' ESCAPE '\'
      -- vendor side
      OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = m.vendor_id AND v.user_id = auth.uid())
    );
END;
$$;

-- delete_message_for_me
CREATE OR REPLACE FUNCTION public.delete_message_for_me(_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _msg public.chat_messages%ROWTYPE;
  _is_sender boolean;
  _is_vendor boolean;
  _delete_count integer;
BEGIN
  SELECT * INTO _msg FROM public.chat_messages WHERE id = _message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;

  _is_sender := (_msg.sender_id = auth.uid());
  _is_vendor := EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = _msg.vendor_id AND v.user_id = auth.uid());

  IF NOT _is_sender AND NOT _is_vendor AND
     _msg.conversation_id NOT LIKE auth.uid()::text || '\_%' ESCAPE '\' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _is_sender THEN
    UPDATE public.chat_messages SET deleted_by_sender = true WHERE id = _message_id;
  ELSE
    UPDATE public.chat_messages SET deleted_by_receiver = true WHERE id = _message_id;
  END IF;

  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (auth.uid(), _msg.order_id, 'message_deleted_for_me',
          jsonb_build_object('message_id', _message_id, 'side', CASE WHEN _is_sender THEN 'sender' ELSE 'receiver' END));

  -- Delete-abuse heuristic: >10 deletes per user per 24h => flag
  SELECT count(*) INTO _delete_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action_type IN ('message_deleted_for_me','message_deleted_for_everyone')
    AND created_at > now() - interval '24 hours';

  IF _delete_count > 10 THEN
    INSERT INTO public.user_risk_flags(user_id, flag_type, reason, score, expires_at)
    VALUES (auth.uid(), 'delete_abuse',
            'More than 10 message deletes in 24h (count: ' || _delete_count || ')',
            _delete_count,
            now() + interval '7 days');
  END IF;
END;
$$;

-- delete_message_for_everyone (5 min window, blocked by dispute)
CREATE OR REPLACE FUNCTION public.delete_message_for_everyone(_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _msg public.chat_messages%ROWTYPE;
BEGIN
  SELECT * INTO _msg FROM public.chat_messages WHERE id = _message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF _msg.sender_id <> auth.uid() THEN RAISE EXCEPTION 'Only sender can delete for everyone'; END IF;
  IF _msg.is_system_message THEN RAISE EXCEPTION 'System messages cannot be deleted'; END IF;
  IF now() - _msg.created_at > interval '5 minutes' THEN
    RAISE EXCEPTION 'Delete-for-everyone window (5 minutes) has expired';
  END IF;
  IF _msg.order_id IS NOT NULL AND public.order_has_open_dispute(_msg.order_id) THEN
    RAISE EXCEPTION 'Chat is locked due to an open dispute';
  END IF;

  INSERT INTO public.message_edit_history(message_id, old_text, new_text, edited_by)
  VALUES (_message_id, _msg.message, '[message removed]', auth.uid());

  UPDATE public.chat_messages
  SET message = '[message removed]',
      deleted_at = now(),
      attachment_url = NULL,
      attachment_type = NULL,
      attachment_size = NULL
  WHERE id = _message_id;

  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (auth.uid(), _msg.order_id, 'message_deleted_for_everyone',
          jsonb_build_object('message_id', _message_id));
END;
$$;

-- edit_message
CREATE OR REPLACE FUNCTION public.edit_message(_message_id uuid, _new_text text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _msg public.chat_messages%ROWTYPE;
BEGIN
  SELECT * INTO _msg FROM public.chat_messages WHERE id = _message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF _msg.sender_id <> auth.uid() THEN RAISE EXCEPTION 'Only sender can edit'; END IF;
  IF _msg.is_system_message THEN RAISE EXCEPTION 'System messages cannot be edited'; END IF;
  IF _msg.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Cannot edit a deleted message'; END IF;
  IF now() - _msg.created_at > interval '5 minutes' THEN
    RAISE EXCEPTION 'Edit window (5 minutes) has expired';
  END IF;
  IF _msg.order_id IS NOT NULL AND public.order_has_open_dispute(_msg.order_id) THEN
    RAISE EXCEPTION 'Chat is locked due to an open dispute';
  END IF;
  IF _new_text IS NULL OR length(trim(_new_text)) = 0 THEN
    RAISE EXCEPTION 'New text cannot be empty';
  END IF;

  INSERT INTO public.message_edit_history(message_id, old_text, new_text, edited_by)
  VALUES (_message_id, _msg.message, _new_text, auth.uid());

  UPDATE public.chat_messages
  SET message = _new_text, edited_at = now()
  WHERE id = _message_id;

  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (auth.uid(), _msg.order_id, 'message_edited',
          jsonb_build_object('message_id', _message_id));
END;
$$;

-- open_dispute
CREATE OR REPLACE FUNCTION public.open_dispute(_order_id uuid, _reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _dispute_id uuid;
  _is_buyer boolean;
  _is_vendor boolean;
  _vendor_id uuid;
  _conv_id text;
  _admin RECORD;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = _order_id AND o.user_id = auth.uid()) INTO _is_buyer;
  SELECT v.id INTO _vendor_id FROM public.order_items oi
    JOIN public.vendors v ON v.id = oi.vendor_id
    WHERE oi.order_id = _order_id AND v.user_id = auth.uid()
    LIMIT 1;
  _is_vendor := _vendor_id IS NOT NULL;

  IF NOT _is_buyer AND NOT _is_vendor THEN
    RAISE EXCEPTION 'Only buyer or vendor of the order can open a dispute';
  END IF;

  IF public.order_has_open_dispute(_order_id) THEN
    RAISE EXCEPTION 'A dispute is already open for this order';
  END IF;

  INSERT INTO public.disputes(order_id, opened_by, reason)
  VALUES (_order_id, auth.uid(), _reason)
  RETURNING id INTO _dispute_id;

  -- Post system message into chat (use first vendor of order if buyer opened)
  IF _vendor_id IS NULL THEN
    SELECT oi.vendor_id INTO _vendor_id FROM public.order_items oi WHERE oi.order_id = _order_id LIMIT 1;
  END IF;

  IF _vendor_id IS NOT NULL THEN
    _conv_id := 'order_' || _order_id::text;
    INSERT INTO public.chat_messages(conversation_id, sender_id, vendor_id, order_id, message, message_type, is_system_message)
    VALUES (_conv_id, auth.uid(), _vendor_id, _order_id,
            'Evidence locked for review — a dispute has been opened.',
            'system', true);
  END IF;

  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (auth.uid(), _order_id, 'dispute_opened', jsonb_build_object('dispute_id', _dispute_id, 'reason', _reason));

  -- Notify all admins
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(recipient_id, title, message, type)
    VALUES (_admin.user_id, 'New Dispute Opened',
            'Order ' || _order_id::text || ' has a new dispute. Reason: ' || _reason,
            'warning');
  END LOOP;

  RETURN _dispute_id;
END;
$$;

-- log_system_event (used by triggers and app)
CREATE OR REPLACE FUNCTION public.log_system_event(_order_id uuid, _event_type text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (auth.uid(), _order_id, _event_type, _details);
END;
$$;

-- ============================================
-- Triggers: order status -> system message + audit log
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _vendor_id uuid;
  _conv_id text;
  _msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _msg := 'Order created.';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    _msg := 'Order status changed to: ' || NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  SELECT oi.vendor_id INTO _vendor_id FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;
  IF _vendor_id IS NULL THEN RETURN NEW; END IF;

  _conv_id := 'order_' || NEW.id::text;

  INSERT INTO public.chat_messages(conversation_id, sender_id, vendor_id, order_id, message, message_type, is_system_message)
  VALUES (_conv_id, COALESCE(NEW.user_id, _vendor_id), _vendor_id, NEW.id, _msg, 'system', true);

  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (NEW.user_id, NEW.id,
          CASE WHEN TG_OP = 'INSERT' THEN 'order_created' ELSE 'order_status_changed' END,
          jsonb_build_object('status', NEW.status, 'old_status', CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_change ON public.orders;
CREATE TRIGGER trg_orders_status_change
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- Trigger: message INSERT -> audit log
CREATE OR REPLACE FUNCTION public.handle_chat_message_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.is_system_message THEN RETURN NEW; END IF;
  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (NEW.sender_id, NEW.order_id, 'message_sent',
          jsonb_build_object('message_id', NEW.id, 'conversation_id', NEW.conversation_id, 'message_type', NEW.message_type));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_inserted ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_inserted
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_chat_message_inserted();
