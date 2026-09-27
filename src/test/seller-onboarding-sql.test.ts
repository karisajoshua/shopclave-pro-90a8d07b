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
  expect(s).toContain("status IN ('draft','more_information_required')");
  expect(s).toContain("REVOKE ALL ON FUNCTION");
  expect(s).toContain("TO authenticated");
  expect(s).not.toContain("reviewed_by=EXCLUDED");
 });
});
