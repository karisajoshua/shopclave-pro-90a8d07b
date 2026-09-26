import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { normalizeLines, idempotencyKey, nextReservationStatus } from "../../supabase/functions/_shared/inventory";

const a = { product_id: "b", variant_id: null, vendor_id: "v1", quantity: 1 };
const b = { product_id: "a", variant_id: "x", vendor_id: "v2", quantity: 2 };

describe("inventory helpers", () => {
  it("merges and sorts lines across vendors", () => {
    const n = normalizeLines([a, b, { ...a, quantity: 2 }]);
    expect(n.map((l) => l.product_id)).toEqual(["a", "b"]);
    expect(n[1].quantity).toBe(3);
  });
  it("rejects bad quantity and vendor mismatch", () => {
    expect(() => normalizeLines([{ ...a, quantity: 0 }])).toThrow();
    expect(() => normalizeLines([a, { ...a, vendor_id: "v9" }])).toThrow();
  });
  it("idempotency key is order-independent and changes with cart", async () => {
    const k1 = await idempotencyKey("u", [a, b], "addr", ["q2", "q1"]);
    const k2 = await idempotencyKey("u", [b, a], "addr", ["q1", "q2"]);
    const k3 = await idempotencyKey("u", [a], "addr", ["q1", "q2"]);
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
  });
  it("reservation transitions are terminal and replay-safe", () => {
    expect(nextReservationStatus("reserved", "paid")).toBe("committed");
    expect(nextReservationStatus("reserved", "expired")).toBe("released");
    expect(nextReservationStatus("committed", "failed")).toBe("committed");
    expect(nextReservationStatus("released", "paid")).toBe("released");
  });
  it("SQL draft is server-only and locks rows", () => {
    const sql = readFileSync("docs/inventory/migrations-draft/001_stock_reservations.sql", "utf8");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.reserve_order_stock.*anon, authenticated/);
    expect(sql).not.toMatch(/GRANT EXECUTE[^;]*TO (anon|authenticated)/);
    expect(sql).not.toMatch(/GRANT[^;]*stock_reservations[^;]*TO (anon|authenticated)/);
    expect(sql).not.toMatch(/\bDROP\b/);
  });
  it("late payment with no stock becomes an exception, never negative stock", () => {
    expect(nextReservationStatus("reserved", "paid", 3, 1)).toBe("exception");
    expect(nextReservationStatus("exception", "paid", 3, 10)).toBe("exception");
    const sql = readFileSync("docs/inventory/migrations-draft/001_stock_reservations.sql", "utf8");
    expect(sql).toMatch(/stock = stock - r\.quantity WHERE id = r\.product_id AND stock >= r\.quantity/);
    expect(sql).toMatch(/stock = stock - r\.quantity WHERE id = r\.variant_id AND stock >= r\.quantity/);
    expect(sql).toContain("INSERT INTO stock_exceptions");
    expect(sql).toContain("ON CONFLICT (reservation_id) DO NOTHING");
    expect(sql).toContain("NOT atomic with create-order");
  });
  it("release never touches committed or exception rows", () => {
    const sql = readFileSync("docs/inventory/migrations-draft/001_stock_reservations.sql", "utf8");
    expect(sql).toMatch(/SET status = 'released'[^;]*WHERE order_id = _order_id AND status = 'reserved'/);
  });
});
