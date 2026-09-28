import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { hasShipped } from "@/lib/orderTracking";
import { isLiveStripeKey, liveCheckoutAllowed } from "../../supabase/functions/_shared/stripeLiveGuard";

describe("tracking visibility", () => {
  it("hides carrier before shipment", () => {
    expect(hasShipped("preparing")).toBe(false);
    expect(hasShipped("ready_for_pickup")).toBe(false);
    expect(hasShipped(null)).toBe(false);
    expect(hasShipped("in_transit")).toBe(true);
    expect(hasShipped("delivered")).toBe(true);
  });
});

describe("live Stripe guard", () => {
  it("blocks live keys unless explicitly enabled", () => {
    expect(isLiveStripeKey("sk_live_x")).toBe(true);
    expect(isLiveStripeKey("sk_test_x")).toBe(false);
    expect(liveCheckoutAllowed("sk_live_x", undefined)).toBe(false);
    expect(liveCheckoutAllowed("rk_live_x", "yes")).toBe(false);
    expect(liveCheckoutAllowed("sk_live_x", "true")).toBe(true);
    expect(liveCheckoutAllowed("sk_test_x", undefined)).toBe(true);
  });
  it("stripe-initialize checks the guard before reuse and before creating sessions", () => {
    const src = readFileSync("supabase/functions/stripe-initialize/index.ts", "utf8");
    expect(src.match(/liveCheckoutAllowed\(/g)?.length).toBe(2);
    expect(src.indexOf("liveCheckoutAllowed(secretKey")).toBeLessThan(src.indexOf("checkout/sessions/"));
  });
});

describe("checkout review step", () => {
  const src = readFileSync("src/pages/CheckoutPage.tsx", "utf8");
  it("has a review step between delivery and payment", () => {
    expect(src).toMatch(/"address" \| "delivery" \| "review" \| "payment"/);
    expect(src).toContain('setActiveStep("review")');
  });
  it("shows a server-calculated tax total and blocks payment until it is available", () => {
    expect(src).toContain("Order total (incl. taxes)");
    expect(src).toContain('supabase.functions\n      .invoke("tax-quote"');
    expect(src).toMatch(/disabled=\{taxLoading \|\| !taxQuote\?\.ok\}/);
  });
  it("never computes tax in the browser", () => {
    expect(src).not.toMatch(/0\.13|0\.05|ratePpm/);
  });
});
