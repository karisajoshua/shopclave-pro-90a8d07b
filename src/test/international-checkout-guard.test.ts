import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("legacy checkout fail-closed guard", () => {
  const source = readFileSync(resolve(process.cwd(), "supabase/functions/create-order/index.ts"), "utf8");
  it("checks a strict Canada allowlist before inserting any order", () => {
    const guard = source.indexOf('["CA", "CANADA"].includes(shipping_address.country.trim().toUpperCase())');
    expect(guard).toBeGreaterThan(0);
    expect(source.indexOf('.from("orders")')).toBeGreaterThan(guard);
    expect(source).toContain("International checkout is not yet enabled");
  });
  it("does not use permissive country abbreviation for this security boundary", () => {
    expect(source).not.toContain('toISO(shipping_address.country) !== "CA"');
  });
});
