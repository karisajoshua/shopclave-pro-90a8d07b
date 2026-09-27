// Static migration guardrails; database-level concurrency tests are still required.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../docs/international/migrations-draft/002_atomic_quote_claim.sql", import.meta.url),
  "utf8",
);

describe("international quote claim SQL safety contract", () => {
  it("restricts execution to the server service role", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.claim_international_quotes[\s\S]*FROM PUBLIC/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.claim_international_quotes[\s\S]*FROM anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.claim_international_quotes[\s\S]*TO service_role/);
  });
  it("locks the shopper order and selected quotes", () => {
    expect(sql).toContain("WHERE o.id = p_order_id FOR UPDATE");
    expect(sql).toContain("order_owner IS DISTINCT FROM p_user_id");
    expect(sql).toContain("ORDER BY id FOR UPDATE");
  });
  it("checks expiration, fingerprints, consent and previous use", () => {
    for (const check of [
      "q.expires_at <= now()", "q.consumed_order_id IS NOT NULL",
      "q.address_fingerprint <> p_address_fingerprint",
      "q.items_fingerprint <> p_items_fingerprint",
      "q.parcel_fingerprint <> p_vendor_parcels",
      "p_dap_acknowledged IS NOT TRUE",
      "claimed_count <> cardinality(p_quote_ids)",
    ]) expect(sql).toContain(check);
  });
});
