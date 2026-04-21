-- 1. Add original_* columns to preserve evidence
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS original_message text,
  ADD COLUMN IF NOT EXISTS original_attachment_url text,
  ADD COLUMN IF NOT EXISTS original_attachment_type text,
  ADD COLUMN IF NOT EXISTS original_attachment_size integer;

-- 2. Update delete_message_for_everyone to snapshot first
CREATE OR REPLACE FUNCTION public.delete_message_for_everyone(_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SET
    -- Snapshot original content for admin evidence (only if not already snapshotted)
    original_message = COALESCE(original_message, _msg.message),
    original_attachment_url = COALESCE(original_attachment_url, _msg.attachment_url),
    original_attachment_type = COALESCE(original_attachment_type, _msg.attachment_type),
    original_attachment_size = COALESCE(original_attachment_size, _msg.attachment_size),
    -- Public-facing fields cleared as before
    message = '[message removed]',
    deleted_at = now(),
    attachment_url = NULL,
    attachment_type = NULL,
    attachment_size = NULL
  WHERE id = _message_id;

  INSERT INTO public.audit_logs(user_id, order_id, action_type, action_details)
  VALUES (auth.uid(), _msg.order_id, 'message_deleted_for_everyone',
          jsonb_build_object('message_id', _message_id));
END;
$function$;

-- 3. Update delete_message_for_me to snapshot first (so admins always see what was hidden)
CREATE OR REPLACE FUNCTION public.delete_message_for_me(_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    UPDATE public.chat_messages
    SET deleted_by_sender = true,
        original_message = COALESCE(original_message, _msg.message),
        original_attachment_url = COALESCE(original_attachment_url, _msg.attachment_url),
        original_attachment_type = COALESCE(original_attachment_type, _msg.attachment_type),
        original_attachment_size = COALESCE(original_attachment_size, _msg.attachment_size)
    WHERE id = _message_id;
  ELSE
    UPDATE public.chat_messages
    SET deleted_by_receiver = true,
        original_message = COALESCE(original_message, _msg.message),
        original_attachment_url = COALESCE(original_attachment_url, _msg.attachment_url),
        original_attachment_type = COALESCE(original_attachment_type, _msg.attachment_type),
        original_attachment_size = COALESCE(original_attachment_size, _msg.attachment_size)
    WHERE id = _message_id;
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
$function$;

-- 4. Admin-only RPC to fetch originals
CREATE OR REPLACE FUNCTION public.admin_get_message_originals(_message_ids uuid[])
 RETURNS TABLE(
   id uuid,
   original_message text,
   original_attachment_url text,
   original_attachment_type text,
   original_attachment_size integer
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can read preserved message originals';
  END IF;

  RETURN QUERY
    SELECT m.id, m.original_message, m.original_attachment_url,
           m.original_attachment_type, m.original_attachment_size
    FROM public.chat_messages m
    WHERE m.id = ANY(_message_ids);
END;
$function$;

-- 5. Backfill original_message from edit history for previously-deleted rows
UPDATE public.chat_messages cm
SET original_message = sub.old_text
FROM (
  SELECT DISTINCT ON (meh.message_id)
    meh.message_id, meh.old_text
  FROM public.message_edit_history meh
  WHERE meh.new_text = '[message removed]'
  ORDER BY meh.message_id, meh.edited_at DESC
) sub
WHERE cm.id = sub.message_id
  AND cm.original_message IS NULL
  AND (cm.deleted_at IS NOT NULL OR cm.deleted_by_sender = true OR cm.deleted_by_receiver = true);