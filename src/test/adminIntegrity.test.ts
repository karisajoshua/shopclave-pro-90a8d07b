import { describe, it, expect } from "vitest";
import { fetchAllRows, computeFinancials } from "@/lib/adminMetrics";
import { aggregateOrderStatus, canVendorTransition } from "@/lib/orderStatus";

describe("multivendor status aggregation", () => {
  it("does not mark order delivered when one vendor is still shipping", () => {
    expect(aggregateOrderStatus([{ status: "delivered" }, { status: "shipped" }])).toBe("shipped");
    expect(aggregateOrderStatus([{ status: "delivered" }, { status: "pending" }])).toBe("processing");
  });
  it("ignores cancelled lines, all-cancelled is cancelled", () => {
    expect(aggregateOrderStatus([{ status: "delivered" }, { status: "cancelled" }])).toBe("delivered");
    expect(aggregateOrderStatus([{ status: "cancelled" }])).toBe("cancelled");
    expect(aggregateOrderStatus([{ status: "pending" }])).toBe("pending");
  });
  it("vendor transitions are single-step and paid-gated", () => {
    expect(canVendorTransition("pending", "processing", "paid")).toBe(true);
    expect(canVendorTransition("pending", "delivered", "paid")).toBe(false);
    expect(canVendorTransition("shipped", "pending", "paid")).toBe(false);
    expect(canVendorTransition("pending", "processing", "pending")).toBe(false);
  });
});

describe("dashboard financials", () => {
  const cutoff = new Date("2026-09-01T00:00:00Z");
  const orders = [
    { id: "a", created_at: "2026-09-10", total: 100, payment_status: "paid", status: "delivered" },
    { id: "b", created_at: "2026-09-10", total: 50, payment_status: "pending", status: "delivered" },
    { id: "c", created_at: "2026-08-01", total: 999, payment_status: "paid", status: "delivered" },
    { id: "d", created_at: "2026-09-11", total: 20, payment_status: "pending", status: "cancelled" },
  ];
  const items = [
    { order_id: "a", created_at: "2026-09-10", price: 100, quantity: 1, commission_amount: 12, vendor_payout: 85, refunded_amount: 10 },
    { order_id: "b", created_at: "2026-09-10", price: 50, quantity: 1, commission_amount: 6, vendor_payout: 40, refunded_amount: 0 },
  ];
  it("counts only paid orders inside the date window", () => {
    const m = computeFinancials(orders, items, cutoff);
    expect(m).toMatchObject({ totalOrders: 3, paidOrders: 1, pendingPaymentOrders: 2, cancelledOrders: 1,
      grossPaidSales: 100, refunds: 10, netSales: 90, commission: 12, vendorEarnings: 85 });
  });
});

describe("fetchAllRows", () => {
  it("pages past the row cap", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => i);
    const rows = await fetchAllRows<number>(async (f, t) => ({ data: all.slice(f, t + 1), error: null }));
    expect(rows).toHaveLength(2500);
  });
  it("throws instead of returning a misleading empty list", async () => {
    await expect(fetchAllRows(async () => ({ data: null, error: { message: "permission denied" } }))).rejects.toThrow("permission denied");
  });
});
