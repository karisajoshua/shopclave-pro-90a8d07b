import { describe, it, expect } from "vitest";
import { isLaunchOrigin } from "../../supabase/functions/_shared/shipping";

describe("Canada-only seller origin", () => {
  it("accepts Canada", () => {
    for (const c of ["CA", "ca", " Canada ", "CANADA"]) expect(isLaunchOrigin(c)).toBe(true);
  });
  it("rejects every other or missing origin", () => {
    for (const c of ["US", "KE", "GB", "Cameroon", "Cambodia", "", undefined, null, "C A"]) expect(isLaunchOrigin(c)).toBe(false);
  });
});
