import { describe, it, expect } from "vitest";
import { classifyStripeKey, connectKeyAllowed, liveCheckoutAllowed } from "../../supabase/functions/_shared/stripeLiveGuard";

describe("Stripe key classification", () => {
  it("classifies valid prefixes", () => {
    expect(classifyStripeKey("sk_test_abc")).toBe("test");
    expect(classifyStripeKey("rk_test_abc")).toBe("test");
    expect(classifyStripeKey("sk_live_abc")).toBe("live");
    expect(classifyStripeKey("rk_live_abc")).toBe("live");
  });
  it("rejects everything else", () => {
    for (const k of [undefined, null, "", "pk_live_abc", "pk_test_abc", "sk_live_", "whsec_abc", "SK_LIVE_abc", " sk_live_abc", "sk_prod_abc"])
      expect(classifyStripeKey(k as string)).toBe("invalid");
  });
});

describe("Connect live gating", () => {
  it("allows test keys without the flag", () => {
    expect(connectKeyAllowed("sk_test_x", undefined)).toEqual({ ok: true, mode: "test" });
    expect(connectKeyAllowed("rk_test_x", undefined)).toEqual({ ok: true, mode: "test" });
  });
  it("blocks live keys unless flag is exactly 'true'", () => {
    for (const flag of [undefined, null, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(connectKeyAllowed("sk_live_x", flag as string)).toEqual({ ok: false, reason: "live_disabled" });
      expect(connectKeyAllowed("rk_live_x", flag as string)).toEqual({ ok: false, reason: "live_disabled" });
    }
    expect(connectKeyAllowed("rk_live_x", "true")).toEqual({ ok: true, mode: "live" });
  });
  it("rejects invalid keys even with the flag", () => {
    expect(connectKeyAllowed("pk_live_x", "true")).toEqual({ ok: false, reason: "invalid" });
  });
  it("live checkout guard is unchanged", () => {
    expect(liveCheckoutAllowed("rk_live_x", undefined)).toBe(false);
    expect(liveCheckoutAllowed("sk_test_x", undefined)).toBe(true);
  });
});
