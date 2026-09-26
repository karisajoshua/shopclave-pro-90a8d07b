import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Static verification of the email-timing contract:
// - create-order must NOT send the "received" email for online card payments
//   (Stripe/Paystack); only offline methods get it at placement.
// - Both signed webhooks send the "paid" email with vendor notification.
// - order-emails.ts refuses to send "paid" unless payment_status === "paid"
//   and uses stable idempotency keys so replays never duplicate.

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("order email timing", () => {
  it("create-order skips the received email for online card payments", () => {
    const src = read("supabase/functions/create-order/index.ts");
    // The received-stage send must be gated behind an offline-method check.
    expect(src).toContain('if (!ONLINE_METHODS.has(payment_method))');
    const gated = src.split('if (!ONLINE_METHODS.has(payment_method))')[1];
    expect(gated).toContain('sendOrderEmails(adminClient, order.id, "received"');
    // No unguarded "received" send may remain.
    const ungated = src.split('if (!ONLINE_METHODS.has(payment_method))')[0];
    expect(ungated).not.toContain('"received"');
  });

  it("online methods set covers card payments", () => {
    const src = read("supabase/functions/_shared/order-emails.ts");
    expect(src).toContain('ONLINE_METHODS = new Set(["card"])');
  });

  it("both webhooks send the paid email with vendor notification", () => {
    for (const f of ["stripe-webhook", "paystack-webhook"]) {
      const src = read(`supabase/functions/${f}/index.ts`);
      expect(src).toContain('sendOrderEmails(admin, orderId, "paid", { notifyVendors: true })');
    }
  });

  it("paid email is payment-gated and idempotent", () => {
    const src = read("supabase/functions/_shared/order-emails.ts");
    expect(src).toContain('if (stage === "paid" && order.payment_status !== "paid")');
    expect(src).toContain("idempotencyKey: `order-${stage}-${order.id}`");
    expect(src).toContain("idempotencyKey: `vendor-new-order-${order.id}-${v.id}`");
  });
});
