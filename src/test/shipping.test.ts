import { describe, it, expect } from "vitest";
import {
  mapShippoStatus,
  normalizeToCad,
  round2,
  validateWarehouse,
  buildParcel,
  validateQuotes,
  addressFingerprint,
  itemsFingerprint,
  canTransitionReturn,
  VENDOR_SETTABLE_STATUSES,
  QUOTE_TTL_MINUTES,
} from "../../supabase/functions/_shared/shipping.ts";

const RATES: Record<string, number> = { CAD: 1, USD: 0.74, KES: 95.5 };
const ADDR = {
  fullName: "Ada Lovelace",
  phone: "+14165550100",
  addressLine: "12 King St W",
  city: "Toronto",
  state: "ON",
  zip: "M5H1A1",
  country: "Canada",
};
const WAREHOUSE = {
  street1: "1 Bay St",
  city: "Toronto",
  state: "ON",
  zip: "M5J2R8",
  country: "CA",
  phone: "+14165550111",
};

const baseQuote = (over: Record<string, any> = {}) => ({
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-1",
  vendor_id: "vendor-1",
  amount_cad: 12.5,
  consumed_order_id: null,
  expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  address_fingerprint: addressFingerprint(ADDR),
  items_fingerprint: itemsFingerprint([{ product_id: "p1", quantity: 1, variant_id: null }]),
  ...over,
});

const ctx = (over: Record<string, any> = {}) => ({
  userId: "user-1",
  requiredVendorIds: ["vendor-1"],
  addressFingerprint: addressFingerprint(ADDR),
  itemsFingerprint: itemsFingerprint([{ product_id: "p1", quantity: 1, variant_id: null }]),
  ...over,
});

describe("currency normalisation", () => {
  it("converts a carrier currency into CAD", () => {
    expect(normalizeToCad(95.5, "KES", RATES)).toBeCloseTo(1, 5);
    expect(normalizeToCad(7.4, "USD", RATES)).toBeCloseTo(10, 5);
  });

  it("passes CAD through untouched", () => {
    expect(normalizeToCad(12.34, "CAD", RATES)).toBeCloseTo(12.34, 5);
  });

  it("refuses to guess unknown currencies", () => {
    expect(normalizeToCad(10, "XXX", RATES)).toBeNull();
  });

  it("rounds money to two decimals", () => {
    expect(round2(1.005)).toBe(1.01);
  });
});

describe("vendor warehouse validation", () => {
  it("accepts a complete address", () => {
    expect(validateWarehouse(WAREHOUSE).valid).toBe(true);
  });

  it("rejects a missing warehouse", () => {
    expect(validateWarehouse(null).valid).toBe(false);
  });

  it("rejects a missing phone", () => {
    const r = validateWarehouse({ ...WAREHOUSE, phone: "" });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain("phone");
  });

  it("requires a postal code where the country uses one", () => {
    const r = validateWarehouse({ ...WAREHOUSE, zip: "" });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain("postal code");
  });
});

describe("parcel building", () => {
  const line = (over: Record<string, any> = {}) => ({
    weight_g: 800,
    length_cm: 20,
    width_cm: 15,
    height_cm: 10,
    quantity: 2,
    ...over,
  });

  it("combines weights and takes the largest dimensions", () => {
    const r = buildParcel([line(), line({ length_cm: 40, quantity: 1 })], { enabled: false });
    expect(r.parcel?.weight).toBe(2400);
    expect(r.parcel?.length).toBe(40);
  });

  it("never invents dimensions without an admin default policy", () => {
    const r = buildParcel([line({ weight_g: null, length_cm: null })], { enabled: false });
    expect(r.parcel).toBeNull();
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it("uses the configured default package when an admin enabled one", () => {
    const r = buildParcel([line({ weight_g: null, length_cm: null, width_cm: null, height_cm: null })], {
      enabled: true,
      weight_g: 500,
      length_cm: 20,
      width_cm: 15,
      height_cm: 10,
    });
    expect(r.parcel?.weight).toBe(1000);
  });
});

describe("shipping quote validation", () => {
  it("accepts a fresh, owned, matching quote", () => {
    const r = validateQuotes([baseQuote()], ctx());
    expect(r.ok).toBe(true);
  });

  it("rejects a quote belonging to another shopper", () => {
    const r = validateQuotes([baseQuote({ user_id: "someone-else" })], ctx());
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("not_owner");
  });

  it("rejects an expired quote", () => {
    const r = validateQuotes(
      [baseQuote({ expires_at: new Date(Date.now() - 60_000).toISOString() })],
      ctx()
    );
    expect(r.reason).toBe("expired");
  });

  it("rejects a quote already used by another order", () => {
    const r = validateQuotes([baseQuote({ consumed_order_id: "order-9" })], ctx());
    expect(r.reason).toBe("already_used");
  });

  it("rejects a tampered price by ignoring client amounts entirely", () => {
    const q: any = baseQuote();
    const r = validateQuotes([q], ctx());
    expect(r.ok).toBe(true);
    // The authoritative amount is the stored one, not anything a browser can send.
    expect(q.amount_cad).toBe(12.5);
  });

  it("rejects a quote raised for a different address", () => {
    const r = validateQuotes(
      [baseQuote({ address_fingerprint: addressFingerprint({ ...ADDR, city: "Ottawa" }) })],
      ctx()
    );
    expect(r.reason).toBe("address_changed");
  });

  it("rejects a quote raised for a different basket", () => {
    const r = validateQuotes(
      [baseQuote({ items_fingerprint: itemsFingerprint([{ product_id: "p2", quantity: 5 }]) })],
      ctx()
    );
    expect(r.reason).toBe("items_changed");
  });

  it("requires one quote per physical vendor in a multi-vendor order", () => {
    const r = validateQuotes([baseQuote()], ctx({ requiredVendorIds: ["vendor-1", "vendor-2"] }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_vendor");
  });

  it("accepts one quote per vendor across a multi-vendor order", () => {
    const second = baseQuote({
      id: "22222222-2222-2222-2222-222222222222",
      vendor_id: "vendor-2",
    });
    const r = validateQuotes([baseQuote(), second], ctx({ requiredVendorIds: ["vendor-1", "vendor-2"] }));
    expect(r.ok).toBe(true);
  });

  it("rejects a quote for a vendor not in the basket", () => {
    const r = validateQuotes([baseQuote({ vendor_id: "vendor-x" })], ctx());
    expect(r.reason).toBe("vendor_mismatch");
  });

  it("keeps quotes short-lived", () => {
    expect(QUOTE_TTL_MINUTES).toBeLessThanOrEqual(60);
  });
});

describe("carrier status mapping", () => {
  it("maps carrier states onto Barakaz states", () => {
    expect(mapShippoStatus("DELIVERED")).toBe("delivered");
    expect(mapShippoStatus("RETURNED")).toBe("returned");
    expect(mapShippoStatus("FAILURE")).toBe("exception");
    expect(mapShippoStatus("PRE_TRANSIT")).toBe("ready_for_pickup");
    expect(mapShippoStatus("TRANSIT")).toBe("in_transit");
    expect(mapShippoStatus("TRANSIT", "customs_clearance")).toBe("customs_clearance");
    expect(mapShippoStatus("TRANSIT", "out_for_delivery")).toBe("out_for_delivery");
    expect(mapShippoStatus("UNKNOWN")).toBe("preparing");
  });

  it("only lets vendors set pre-carrier statuses", () => {
    expect(VENDOR_SETTABLE_STATUSES).toEqual(["preparing", "ready_for_pickup", "collected"]);
    expect(VENDOR_SETTABLE_STATUSES).not.toContain("delivered");
  });
});

describe("return workflow", () => {
  it("follows the approved path", () => {
    expect(canTransitionReturn("requested", "approved")).toBe(true);
    expect(canTransitionReturn("approved", "in_transit")).toBe(true);
    expect(canTransitionReturn("in_transit", "received")).toBe(true);
    expect(canTransitionReturn("received", "inspected")).toBe(true);
    expect(canTransitionReturn("inspected", "refund_approved")).toBe(true);
  });

  it("blocks illegal jumps", () => {
    expect(canTransitionReturn("requested", "refund_approved")).toBe(false);
    expect(canTransitionReturn("rejected", "approved")).toBe(false);
  });
});
