
Goal: restore all authentication emails (verification + password recovery) so they are actually delivered from your domain.

What I found
- The auth flow is triggering correctly (recovery requests return 200 and “hook ran successfully” in backend auth logs).
- Your email domain is verified.
- Email infrastructure exists (queues + cron + state table), but `email_send_log` is empty and queues are empty after requests.
- The `auth-email-hook` endpoint is returning `401` on live calls, which means emails are getting blocked before enqueue/send.

Implementation plan
1. Re-sync the auth email hook with the managed Lovable Cloud auth-email setup (non-destructive first, overwrite only if needed).
2. Force redeploy the auth email hook so runtime config is fully applied (especially webhook/public access behavior).
3. Reconcile sender settings in the hook (`sender_domain` / `from`) with the active project email domain configuration to avoid silent provider rejections.
4. Add/adjust structured logs in `auth-email-hook` around:
   - webhook verification result
   - selected template/action_type
   - enqueue success/failure
   so failures become immediately visible in logs.
5. Run one idempotent email-infrastructure refresh (to ensure queue dispatcher secret + cron wiring are current), then redeploy queue processor.
6. End-to-end verification:
   - trigger email verification and password recovery from `/auth`
   - confirm new rows appear in `email_send_log` (`pending` then `sent`)
   - confirm no 401 on `auth-email-hook`
   - confirm inbox delivery with branded template.

Technical details (files/systems touched)
- `supabase/functions/auth-email-hook/index.ts` (primary fix + observability)
- `supabase/config.toml` (only if function runtime config needs explicit correction)
- `supabase/functions/process-email-queue/index.ts` (redeploy/compatibility check only)
- Backend tables/queues used for proof: `email_send_log`, `email_send_state`, `auth_emails` queue

Success criteria
- Verification and recovery emails both arrive.
- `auth-email-hook` no longer returns 401 for real auth events.
- Queue/log pipeline shows normal progression (`pending` → `sent`).
