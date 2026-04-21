UPDATE public.chat_messages
SET order_id = substring(conversation_id from 'order_(.*)')::uuid
WHERE conversation_id LIKE 'order_%'
  AND order_id IS NULL;