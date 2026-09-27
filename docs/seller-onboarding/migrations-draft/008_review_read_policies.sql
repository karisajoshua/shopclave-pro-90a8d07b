-- DEVELOPMENT DRAFT. Read-only access for authenticated administrators.
CREATE POLICY seller_applications_admin_read ON public.seller_applications
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=(SELECT auth.uid()) AND r.role='admin')
 );
CREATE POLICY seller_events_admin_read ON public.seller_application_events
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=(SELECT auth.uid()) AND r.role='admin')
 );
CREATE POLICY seller_payout_owner_read ON public.seller_payout_accounts
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.seller_applications a
 WHERE a.id=application_id AND a.user_id=(SELECT auth.uid()))
 );
CREATE POLICY seller_payout_admin_read ON public.seller_payout_accounts
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=(SELECT auth.uid()) AND r.role='admin')
 );
-- Do not expose private document storage paths through generic browser queries.
