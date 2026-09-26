import { describe, it, expect } from "vitest";
import { calculateTax, BASELINE_RATES, normalizeProvince, taxOn, configFromRegistrations, REGISTRATION_STATE, type TaxConfig } from "../../supabase/functions/_shared/tax";

const ALL = new Set(["GST", "HST", "BC:PST", "MB:RST", "SK:PST", "QC:QST"]);
const cfg = (reg = ALL): TaxConfig => ({ rates: BASELINE_RATES, registrations: reg });
const req = (province: string, extra: Partial<Parameters<typeof calculateTax>[0]> = {}) => ({
  province, country: "Canada", date: "2026-09-26", shippingCents: 0,
  lines: [{ id: "a", amountCents: 10000, category: "taxable" as const }], ...extra,
});

const expected: Record<string, number> = {
  AB: 500, NT: 500, NU: 500, YT: 500, ON: 1300, NS: 1400, NB: 1500, NL: 1500, PE: 1500,
  BC: 1200, MB: 1200, SK: 1100, QC: 1498,
};

describe("tax engine", () => {
  for (const [p, cents] of Object.entries(expected)) {
    it(`${p} on $100 = ${cents}c`, () => {
      const r = calculateTax(req(p), cfg());
      expect(r.ok && r.totalTaxCents).toBe(cents);
    });
  }
  it("breaks out QC components", () => {
    const r = calculateTax(req("Québec"), cfg());
    expect(r.ok && r.components.map((c) => [c.component, c.taxCents])).toEqual([["GST", 500], ["QST", 998]]);
  });
  it("zero-rated and exempt lines carry no tax and no shipping tax", () => {
    const r = calculateTax(req("ON", { shippingCents: 1250, lines: [
      { id: "z", amountCents: 5000, category: "zero_rated" }, { id: "e", amountCents: 5000, category: "exempt" }] }), cfg());
    expect(r.ok && r.totalTaxCents).toBe(0);
  });
  it("taxes shipping pro-rata to taxable goods", () => {
    const r = calculateTax(req("ON", { shippingCents: 1250, lines: [
      { id: "t", amountCents: 5000, category: "taxable" }, { id: "z", amountCents: 5000, category: "zero_rated" }] }), cfg());
    expect(r.ok && r.shipping[0]).toMatchObject({ component: "HST", baseCents: 625, taxCents: 81 });
    expect(r.ok && r.totalTaxCents).toBe(650 + 81);
  });
  it("fails closed on unknown category", () => {
    const r = calculateTax(req("ON", { lines: [{ id: "u", amountCents: 100, category: "unknown" }] }), cfg());
    expect(r).toEqual({ ok: false, reason: "unknown_category:u" });
  });
  it("fails closed when provincial registration missing", () => {
    expect(calculateTax(req("BC"), cfg(new Set(["GST", "HST"])))).toEqual({ ok: false, reason: "unregistered:BC:PST" });
    expect(calculateTax(req("AB"), cfg(new Set()))).toEqual({ ok: false, reason: "unregistered:GST" });
  });
  it("fails closed on unsupported jurisdiction", () => {
    expect(calculateTax(req("ON", { country: "Kenya" }), cfg()).ok).toBe(false);
    expect(calculateTax(req("Atlantis"), cfg()).ok).toBe(false);
    expect(calculateTax(req("ON", { date: "2010-01-01" }), cfg())).toEqual({ ok: false, reason: "no_federal_rate" });
  });
  it("respects effective-date boundary (NS 15% -> 14% on 2025-04-01)", () => {
    const before = calculateTax(req("NS", { date: "2025-03-31" }), cfg());
    const on = calculateTax(req("NS", { date: "2025-04-01" }), cfg());
    expect(before.ok && before.totalTaxCents).toBe(1500);
    expect(on.ok && on.totalTaxCents).toBe(1400);
  });
  it("rounds half-up in cents", () => {
    expect(taxOn(10, 50000)).toBe(1);    // 0.5c -> 1
    expect(taxOn(9, 50000)).toBe(0);     // 0.45c -> 0
    expect(taxOn(1999, 99750)).toBe(199); // 199.40c
    expect(() => taxOn(1.5, 50000)).toThrow();
  });
  it("normalizes provinces", () => {
    expect(normalizeProvince(" on ")).toBe("ON");
    expect(normalizeProvince("British Columbia")).toBe("BC");
    expect(normalizeProvince("XX")).toBeNull();
  });
});

describe("GST/HST-only activation (federal registrations, provinces unconfirmed)", () => {
  const federalOnly = new Set(["GST", "HST"]);
  const cfg = { rates: BASELINE_RATES, registrations: federalOnly };
  const province = (p: string) => req(p);

  it("calculates GST provinces and HST provinces", () => {
    for (const p of ["AB", "NT", "NU", "YT"]) {
      const r = calculateTax(province(p), cfg);
      expect(r.ok && r.components.map((c) => [c.component, c.taxCents])).toEqual([["GST", 500]]);
    }
    const on = calculateTax(province("ON"), cfg);
    expect(on.ok && on.components).toEqual([
      expect.objectContaining({ component: "HST", taxCents: 1300 }),
    ]);
  });

  it("fails closed in every province with an unconfirmed registration", () => {
    expect(calculateTax(province("BC"), cfg)).toEqual({ ok: false, reason: "unregistered:BC:PST" });
    expect(calculateTax(province("QC"), cfg)).toEqual({ ok: false, reason: "unregistered:QC:QST" });
    expect(calculateTax(province("MB"), cfg)).toEqual({ ok: false, reason: "unregistered:MB:RST" });
    expect(calculateTax(province("SK"), cfg)).toEqual({ ok: false, reason: "unregistered:SK:PST" });
  });
});

describe("registration state (GST/HST stated 2026-09-25, provincial unknown)", () => {
  const ALL13 = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];
  const stated = configFromRegistrations(BASELINE_RATES, REGISTRATION_STATE, true);

  it("default (unverified not allowed) fails closed everywhere", () => {
    const strict = configFromRegistrations(BASELINE_RATES, REGISTRATION_STATE);
    for (const p of ALL13) expect(calculateTax(req(p), strict).ok).toBe(false);
  });
  it("every province/territory has a federal rate on/after 2026-09-25", () => {
    for (const p of ALL13) {
      const r = calculateTax(req(p, { date: "2026-09-25" }), cfg());
      expect(r.ok).toBe(true);
    }
  });
  it("GST/HST boundary: 2026-09-24 not effective, 2026-09-25 applies", () => {
    expect(calculateTax(req("AB", { date: "2026-09-24" }), stated)).toEqual({ ok: false, reason: "registration_not_effective:GST" });
    expect(calculateTax(req("ON", { date: "2026-09-24" }), stated)).toEqual({ ok: false, reason: "registration_not_effective:HST" });
    const ab = calculateTax(req("AB", { date: "2026-09-25" }), stated);
    const on = calculateTax(req("ON", { date: "2026-09-25" }), stated);
    expect(ab.ok && ab.totalTaxCents).toBe(500);
    expect(on.ok && on.totalTaxCents).toBe(1300);
  });
  it("GST/HST provinces calculate; PST/QST/RST provinces fail closed as unknown", () => {
    for (const p of ["AB", "NT", "NU", "YT", "ON", "NS", "NB", "NL", "PE"]) expect(calculateTax(req(p), stated).ok).toBe(true);
    expect(calculateTax(req("BC"), stated)).toEqual({ ok: false, reason: "unregistered:BC:PST" });
    expect(calculateTax(req("MB"), stated)).toEqual({ ok: false, reason: "unregistered:MB:RST" });
    expect(calculateTax(req("SK"), stated)).toEqual({ ok: false, reason: "unregistered:SK:PST" });
    expect(calculateTax(req("QC"), stated)).toEqual({ ok: false, reason: "unregistered:QC:QST" });
  });
  it("provincial records stay unknown until evidence", () => {
    expect(REGISTRATION_STATE.filter((r) => r.key.includes(":")).every((r) => r.status === "unknown")).toBe(true);
  });
});
