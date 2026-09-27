import { describe, it, expect } from "vitest";
import {
  checkInternationalEligibility, validateQuote, validateSelection, offerableModes,
  internationalPaymentAllowed, INTERNATIONAL_GATE_DEFAULT, normalizeShippoInternationalRates, type LandedCostQuote, type VendorParcel,
} from "../../supabase/functions/_shared/international.ts";

const parcel = (over: Partial<VendorParcel> = {}): VendorParcel => ({
  vendorId: "v1", originCountry: "CA", weightG: 800, lengthCm: 20, widthCm: 15, heightCm: 10,
  lines: [{ productId: "p1", name: "Kettle", hsCode: "8516.71", countryOfManufacture: "CA", declaredValueCad: 40, quantity: 1, weightG: 800 }],
  ...over,
});
const future = () => new Date(Date.now() + 10 * 60_000).toISOString();
const q = (over: Partial<LandedCostQuote> = {}): LandedCostQuote => ({
  id: "q1", userId: "u1", vendorId: "v1", mode: "DDP", source: "dhl_express", verified: true,
  originCountry: "CA", destinationCountry: "US", shippingCad: 30, dutiesCad: 4, importTaxCad: 2,
  customsFeeCad: 1, providerCurrency: "USD", expiresAt: future(), ...over,
});
const sel = { userId: "u1", destination: "US", vendorIds: ["v1"], dapAcknowledged: false };

describe("international eligibility", () => {
  it("accepts complete customs data", () => expect(checkInternationalEligibility("US", [parcel()]).ok).toBe(true));
  it("treats Canada as domestic", () => expect(checkInternationalEligibility("Canada", [parcel()]).ok).toBe(false));
  it("blocks restricted destinations", () => {
    const r = checkInternationalEligibility("KP", [parcel()]);
    expect(r.ok === false && r.issues[0].code).toBe("restricted_destination");
  });
  it("reports missing customs data", () => {
    const r = checkInternationalEligibility("GB", [parcel({ lines: [{ productId: "p1", name: "x", hsCode: "12", countryOfManufacture: null, declaredValueCad: null, quantity: 1, weightG: 100 }] })]);
    expect(r.ok).toBe(false);
    const m = r.ok === false ? r.issues.find((i) => i.code === "missing_customs") : undefined;
    expect(m && "fields" in m && m.fields).toEqual(["hs_code", "country_of_manufacture", "declared_value"]);
  });
  it("reports missing parcel dimensions", () => {
    const r = checkInternationalEligibility("US", [parcel({ lengthCm: null })]);
    expect(r.ok === false && r.issues.some((i) => i.code === "missing_parcel")).toBe(true);
  });
});

describe("landed-cost quotes", () => {
  it("rejects malformed expiry dates", () => expect(validateQuote(q({ expiresAt: "not-a-date" }), sel)).toBe("invalid_expiration"));
  it("rejects expired quotes", () => expect(validateQuote(q({ expiresAt: new Date(Date.now() - 1000).toISOString() }), sel)).toBe("expired"));
  it("rejects unverified and manual quotes", () => {
    expect(validateQuote(q({ verified: false }), sel)).toBe("not_verified");
    expect(validateQuote(q({ source: "manual_admin" }), sel)).toBe("unverified_source");
  });
  it("rejects DDP without real duties", () => expect(validateQuote(q({ dutiesCad: null }), sel)).toBe("ddp_missing_duties"));
  it("rejects another shopper and wrong lane", () => {
    expect(validateQuote(q({ userId: "u2" }), sel)).toBe("not_owner");
    expect(validateQuote(q({ destinationCountry: "GB" }), sel)).toBe("lane_mismatch");
  });
  it("only offers modes with a verified quote", () => {
    expect(offerableModes([q()], "v1", "u1", "US")).toEqual(["DDP"]);
    expect(offerableModes([], "v1", "u1", "US")).toEqual([]);
  });
});

describe("basket selection", () => {
  it("supports mixed DDP/DAP vendors with acknowledgement", () => {
    const quotes = [q(), q({ id: "q2", vendorId: "v2", mode: "DAP", dutiesCad: null, importTaxCad: null, customsFeeCad: null })];
    const base = { ...sel, vendorIds: ["v1", "v2"] };
    expect(validateSelection(quotes, base)).toEqual({ ok: false, issue: "dap_not_acknowledged" });
    const r = validateSelection(quotes, { ...base, dapAcknowledged: true });
    expect(r).toEqual({ ok: true, totalCad: 67, hasDap: true });
  });
  it("rejects duplicate quotes for the same vendor instead of double-charging", () => {
    expect(validateSelection([q(), q({ id: "q-duplicate" })], sel)).toEqual({ ok: false, issue: "duplicate_vendor", vendorId: "v1" });
  });
  it("requires a quote per vendor", () => {
    const r = validateSelection([q()], { ...sel, vendorIds: ["v1", "v2"] });
    expect(r.ok === false && r.issue).toBe("missing_vendor");
  });
});

describe("payment gate", () => {
  it("is closed by default and on partial config", () => {
    expect(internationalPaymentAllowed(INTERNATIONAL_GATE_DEFAULT)).toBe(false);
    expect(internationalPaymentAllowed({ enabled: true, carrierIntegrationVerified: true })).toBe(false);
    expect(internationalPaymentAllowed(null)).toBe(false);
  });
});


describe("Shippo international rate normalization", () => {
  it("creates DAP-only quotes and converts USD rates to CAD", () => {
    const rates = normalizeShippoInternationalRates([{ object_id: "rate-1", amount: "20.00", currency: "USD", provider: "UPS", servicelevel: { name: "Worldwide" } }], { USD: 0.8 });
    expect(rates).toMatchObject([{ rateId: "rate-1", shippingCad: 25, mode: "DAP", dutiesCalculated: false, originalCurrency: "USD" }]);
  });
  it("rejects malformed and unconvertible carrier rates", () => {
    expect(normalizeShippoInternationalRates([{ object_id: "r", amount: "-1", currency: "CAD" }, { object_id: "x", amount: "10", currency: "EUR" }, { amount: "15", currency: "CAD" }], {})).toEqual([]);
  });
});
