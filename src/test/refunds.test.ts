import { describe, it, expect } from "vitest";
import { planRefund } from "../../supabase/functions/_shared/refunds";
import {
  canTransitionReturn,
  RETURN_STATUSES,
} from "../../supabase/functions/_shared/shipping";

const base = {
  lineTotalCad: 100,
  alreadyRefundedCad: 0,
  orderTotalCad: 200,
  chargedAmount: 20000, // 200 CAD charged as 20,000 KES
  chargedCurrency: "KES",
  alreadyRefundedProvider: 0,
};

describe("refund currency handling", () => {
  it("converts the CAD line amount into the currency actually charged", () => {
    const plan = planRefund(base);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.amount_cad).toBe(100);
    expect(plan.provider_amount).toBe(10000);
    expect(plan.provider_currency).toBe("KES");
  });

  it("never sends the raw CAD number as the provider amount", () => {
    const plan = planRefund(base);
    if (!plan.ok) throw new Error("expected plan");
    expect(plan.provider_amount).not.toBe(plan.amount_cad);
  });

  it("caps a refund at the amount actually charged", () => {
    const plan = planRefund({ ...base, alreadyRefundedProvider: 15000 });
    if (!plan.ok) throw new Error("expected plan");
    expect(plan.provider_amount).toBe(5000);
  });

  it("refuses when the order is already fully refunded", () => {
    const plan = planRefund({ ...base, alreadyRefundedProvider: 20000 });
    expect(plan).toEqual({ ok: false, reason: "already_fully_refunded" });
  });

  it("refuses a partial refund that leaves nothing on the line", () => {
    const plan = planRefund({ ...base, alreadyRefundedCad: 100 });
    expect(plan).toEqual({ ok: false, reason: "nothing_to_refund" });
  });

  it("refuses when the original charge amount is unknown", () => {
    expect(planRefund({ ...base, chargedAmount: 0 })).toEqual({
      ok: false, reason: "unknown_charge",
    });
  });

  it("handles a same-currency (CAD) charge without distorting the amount", () => {
    const plan = planRefund({ ...base, chargedAmount: 200, chargedCurrency: "CAD" });
    if (!plan.ok) throw new Error("expected plan");
    expect(plan.provider_amount).toBe(100);
    expect(plan.provider_currency).toBe("CAD");
  });

  it("supports partial refunds of a multi-quantity line", () => {
    const plan = planRefund({ ...base, lineTotalCad: 150, alreadyRefundedCad: 50 });
    if (!plan.ok) throw new Error("expected plan");
    expect(plan.amount_cad).toBe(100);
  });
});

describe("return lifecycle", () => {
  it("supports requested -> reviewed -> approved -> refund processing -> refunded", () => {
    expect(canTransitionReturn("requested", "reviewed")).toBe(true);
    expect(canTransitionReturn("reviewed", "approved")).toBe(true);
    expect(canTransitionReturn("approved", "refund_processing")).toBe(true);
    expect(canTransitionReturn("refund_processing", "refunded")).toBe(true);
  });

  it("does not let a refund jump straight to refunded from requested", () => {
    expect(canTransitionReturn("requested", "refunded")).toBe(false);
  });

  it("treats a rejected return as terminal", () => {
    for (const s of RETURN_STATUSES) {
      expect(canTransitionReturn("rejected", s)).toBe(false);
    }
  });
});
