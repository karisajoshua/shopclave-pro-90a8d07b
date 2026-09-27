import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const sql = (name: string) => readFileSync(resolve(process.cwd(), "docs/seller-onboarding/migrations-draft", name), "utf8");
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
});
