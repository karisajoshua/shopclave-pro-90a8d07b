-- Trigger functions and internal maintenance routines are never meant to be called
-- through the API. Revoke direct EXECUTE from client roles; triggers still fire
-- because they run as the table owner, not the caller.
DO $$
DECLARE
  _fn record;
BEGIN
  FOR _fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
        p.prorettype = 'trigger'::regtype
        OR p.proname IN (
          'recompute_vendor_balance',
          'email_queue_dispatch',
          'enqueue_email',
          'delete_email',
          'read_email_batch',
          'move_to_dlq',
          'log_system_event',
          'admin_get_message_originals'
        )
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', _fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', _fn.sig);
  END LOOP;
END $$;

-- Admin-only evidence reader stays reachable for signed-in admins (it checks the
-- caller's role itself) but not for anonymous visitors.
GRANT EXECUTE ON FUNCTION public.admin_get_message_originals(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_system_event(uuid, text, jsonb) TO authenticated;
