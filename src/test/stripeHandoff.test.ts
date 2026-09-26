import { describe, it, expect, vi } from "vitest";
import { validateStripeCheckoutUrl, logHandoff } from "@/lib/stripeHandoff";

describe("validateStripeCheckoutUrl", () => {
  it("accepts https Stripe checkout URLs", () => {
    expect(validateStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_123")).toContain("checkout.stripe.com");
  });
  it("rejects non-Stripe, lookalike, http and malformed URLs", () => {
    for (const u of [
      "https://evil.com/checkout.stripe.com",
      "https://stripe.com.evil.com/x",
      "https://notstripe.com/x",
      "http://checkout.stripe.com/x",
      "javascript:alert(1)",
      "not a url",
      "",
      undefined,
      42,
    ]) expect(validateStripeCheckoutUrl(u)).toBeNull();
  });
});

describe("logHandoff", () => {
  it("logs only a short order ref and never a URL", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logHandoff("auto_redirect_stalled", { framed: true, orderRef: "95a5010f-aaaa-bbbb", reason: "timeout" });
    const payload = JSON.stringify(spy.mock.calls[0]);
    expect(payload).toContain("95A5010F");
    expect(payload).not.toContain("aaaa");
    expect(payload).not.toContain("http");
    spy.mockRestore();
  });
});
