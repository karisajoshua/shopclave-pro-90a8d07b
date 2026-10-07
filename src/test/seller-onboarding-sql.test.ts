import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const sql = (name: string) => readFileSync(resolve(process.cwd(), "docs/seller-onboarding/migrations-draft", name), "utf8");
const drizzleSql = (name: string) => readFileSync(resolve(process.cwd(), "drizzle/migrations", name), "utf8");
describe("seller onboarding draft SQL safety", () => {
 it("separates approval from payout status and enables RLS", () => {
  const s=sql("001_seller_applications.sql");
  expect(s).toContain("seller_payout_accounts");
  expect(s).toContain("verification_status");
  expect(s).toContain("seller_application_events");
  expect(s).toContain("ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY");
  expect(s).not.toMatch(/CREATE POLICY.*FOR UPDATE/);
 });
 it("only authenticated owners can save draft fields", () => {
  const s=sql("002_draft_autosave_rpc.sql");
  expect(s).toContain("auth.uid()");
  expect(s).toContain("SECURITY DEFINER SET search_path=''");
  expect(s).toContain("status = 'draft'");
  expect(s).toContain("REVOKE ALL ON FUNCTION");
  expect(s).toContain("TO authenticated");
  expect(s).not.toContain("reviewed_by=EXCLUDED");
 });
 it("admin review cannot self-approve or enable payouts", () => {
  const s=sql("003_admin_review_rpc.sql");
  expect(s).toContain("r.role='admin'");
  expect(s).toContain("FOR UPDATE");
  expect(s).toContain("previous_status");
  expect(s).toContain("seller_application_events");
  expect(s).not.toContain("'approved'");
  expect(s).not.toContain("payouts_enabled=");
 });
 it("requires explicit Stripe country enablement and all agreements before submission", () => {
  const s=sql("004_country_rules_and_submission.sql");
  expect(s).toContain("stripe_connect_enabled boolean NOT NULL DEFAULT false");
  expect(s).toContain("stripe_connect_enabled=true");
  expect(s).toContain("seller_agreement_acceptances");
  expect(s).toContain("seller_verification_documents");
  expect(s).toContain("FOR UPDATE");
  expect(s).toContain("status='submitted'");
 });
 it("keeps webhook updates restricted to service role and idempotent", () => {
  const s=sql("007_stripe_account_event_rpc.sql");
  expect(s).toContain("service_role");
  expect(s).toContain("ON CONFLICT(event_id) DO NOTHING");
  expect(s).toContain("last_webhook_at<=p_created_at");
  expect(s).not.toContain("TO authenticated;");
 });
 it("approval requires KYC and does not set payout verification", () => {
  const s=sql("009_admin_approval.sql");
  expect(s).toContain("a.kyc_status <> 'verified'");
  expect(s).toContain("FOR UPDATE");
  expect(s).toContain("seller_application_events");
  expect(s).not.toContain("payouts_enabled=");
 });
 it("KYC review requires admin and independently verified documents", () => {
  const s=sql("010_kyc_review.sql");
  expect(s).toContain("r.role='admin'");
  expect(s).toContain("d.verification_status='verified'");
  expect(s).toContain("previous_kyc");
 });
 it("only registers actual private owner uploads required by country rules", () => {
  const s=sql("012_register_private_kyc_upload.sql");
  expect(s).toContain("auth.uid()");
  expect(s).toContain("r.required_documents");
  expect(s).toContain("storage.objects");
  expect(s).toContain("seller-kyc-private");
  expect(s).toContain("'pending'");
  expect(s).not.toContain("'verified')");
 });
 it("requires document inspection before administrator verification", () => {
  const s=sql("016_document_review.sql");
  expect(s).toContain("r.role='admin'");
  expect(s).toContain("seller_document_access_events");
  expect(s).toContain("FOR UPDATE");
  expect(s).toContain("seller_application_events");
 });
 it("queues seller notifications without exposing private verification data", () => {
  const s=sql("014_notification_outbox.sql");
  expect(s).toContain("seller_notification_outbox");
  expect(s).toContain("AFTER INSERT ON public.seller_application_events");
  expect(s).not.toContain("private_storage_path");
 });
 it("requires configured evidence for independent KYC verification", () => {
  const s=sql("010_kyc_review.sql");
  expect(s).toContain("cardinality(r.required_documents)>0");
  expect(s).toContain("d.verification_status='verified'");
 });
 it("notification worker claims are service-only and replay-safe", () => {
  const s=sql("017_outbox_claims.sql");
  expect(s).toContain("FOR UPDATE SKIP LOCKED");
  expect(s).toContain("claim_token");
  expect(s).toContain("service_role");
  expect(s).toContain("attempts<8");
 });
 it("requires published seller policy versions", () => {
  const s=sql("013_published_seller_policies.sql");
  expect(s).toContain("published_at IS NOT NULL");
  expect(s).toContain("policy_version=r.rules_version");
 });
 it("keeps conditional seller requirements fail-closed and server-evaluable", () => {
  const s=sql("018_conditional_country_requirements.sql");
  expect(s).toContain("conditional_requirements jsonb NOT NULL");
  expect(s).toContain("seller_conditional_requirements");
  expect(s).toContain("is_business_registered");
  expect(s).toContain("business_registration");
  expect(s).toContain("incorporation_or_registration_document");
  expect(s).toContain("stripe_connect_enabled=false");
  expect(s).toContain("REVOKE ALL ON FUNCTION");
 });
 it("requires verified Stripe evidence for every conditional KYC approval path", () => {
  const s=drizzleSql("0021_require_stripe_for_all_seller_kyc.sql");
  const stripeCheck=s.indexOf("Verified Stripe payout account required as identity evidence");
  const documentCheck=s.indexOf("Required documents not independently verified");
  expect(stripeCheck).toBeGreaterThan(-1);
  expect(documentCheck).toBeGreaterThan(stripeCheck);
  expect(s).not.toContain("ELSE\n   IF NOT EXISTS (SELECT 1 FROM public.seller_payout_accounts");
  expect(s).toContain("p.verification_status='verified'");
  expect(s).toContain("p.payouts_enabled=true");
  expect(s).toContain("p.last_webhook_at IS NOT NULL");
 });
});
