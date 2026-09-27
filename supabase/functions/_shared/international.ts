// International shipping / landed-cost domain (DEVELOPMENT ONLY, not wired into checkout).
// Pure and dependency-free so it can be unit-tested with vitest and reused by Edge Functions.
// Nothing here invents duties or rates: a mode is only offerable when a verified
// backend carrier/customs quote exists for that exact vendor parcel.

import { toISO } from "./shipping.ts";

export type IncotermMode = "DDP" | "DAP";
export type QuoteSource = "shippo" | "dhl_express" | "zonos" | "manual_admin";
export const VERIFIED_SOURCES: QuoteSource[] = ["shippo", "dhl_express", "zonos"];

/** Shippo rates only establish shipping prices; never infer prepaid duties. */
export interface ShippoCarrierRate {
  object_id?: unknown;
  amount?: unknown;
  currency?: unknown;
  provider?: unknown;
  servicelevel?: { name?: unknown } | null;
}
export function normalizeShippoInternationalRates(
  rates: ShippoCarrierRate[],
  fxPerCad: Record<string, number>,
) {
  const options: Array<{
    rateId: string; carrier: string; service: string; shippingCad: number;
    originalCurrency: string; originalAmount: number; fxRateToCad: number;
    mode: "DAP"; dutiesCalculated: false;
  }> = [];
  for (const rate of rates) {
    const rateId = typeof rate.object_id === "string" ? rate.object_id.trim() : "";
    const currency = typeof rate.currency === "string" ? rate.currency.trim().toUpperCase() : "";
    const amount = typeof rate.amount === "string" || typeof rate.amount === "number" ? Number(rate.amount) : NaN;
    const perCad = currency === "CAD" ? 1 : fxPerCad[currency];
    if (!rateId || !/^[A-Z]{3}$/.test(currency) || !Number.isFinite(amount) || amount < 0 ||
        !Number.isFinite(perCad) || perCad <= 0) continue;
    const shippingCad = Math.round((amount / perCad + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(shippingCad)) continue;
    options.push({
      rateId, carrier: String(rate.provider ?? "Carrier"),
      service: String(rate.servicelevel?.name ?? "International"),
      shippingCad, originalCurrency: currency, originalAmount: amount,
      fxRateToCad: 1 / perCad, mode: "DAP", dutiesCalculated: false,
    });
  }
  return options;
}


/** Destinations never offered (sanctions / carrier embargo). Admin-reviewable list. */
export const RESTRICTED_DESTINATIONS = new Set(["CU", "IR", "KP", "SY", "RU", "BY"]);

export interface CustomsLine {
  productId: string;
  name: string;
  hsCode: string | null;
  countryOfManufacture: string | null; // ISO-2
  declaredValueCad: number | null; // per unit
  quantity: number;
  weightG: number | null;
}

export interface VendorParcel {
  vendorId: string;
  originCountry: string; // ISO-2, from vendor warehouse
  weightG: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  lines: CustomsLine[];
}

export interface LandedCostQuote {
  id: string;
  userId: string;
  vendorId: string;
  mode: IncotermMode;
  source: QuoteSource;
  verified: boolean; // set only by server after carrier/customs API success
  originCountry: string;
  destinationCountry: string;
  shippingCad: number;
  dutiesCad: number | null; // required for DDP
  importTaxCad: number | null; // required for DDP
  customsFeeCad: number | null; // brokerage/clearance fee
  providerCurrency: string;
  expiresAt: string;
  addressFingerprint?: string;
  itemsFingerprint?: string;
  parcelFingerprint?: string;
}

export const DDP_EXPLANATION =
  "Duties & taxes prepaid (DDP): the import duties and taxes shown were calculated by our carrier for your address and are included in your total. You should not be asked to pay more on delivery.";
export const DAP_EXPLANATION =
  "Duties & taxes due on arrival (DAP): your total covers shipping only. Your country may charge import duties, taxes and a courier handling fee before delivery. These are set by your customs authority and are not collected by Barakaz.";

const HS_RE = /^\d{6}(\d{2,4})?$/; // 6-digit HS, optional national extension

export function normalizeHs(code: string | null | undefined): string {
  return String(code ?? "").replace(/[.\s-]/g, "");
}

export type EligibilityIssue =
  | { code: "domestic"; }
  | { code: "restricted_destination"; country: string }
  | { code: "invalid_country"; field: "origin" | "destination" }
  | { code: "missing_parcel"; vendorId: string; fields: string[] }
  | { code: "missing_customs"; vendorId: string; productId: string; fields: string[] };

/** Validate everything a carrier needs before we may even request an international quote. */
export function checkInternationalEligibility(
  destination: string,
  parcels: VendorParcel[],
): { ok: true } | { ok: false; issues: EligibilityIssue[] } {
  const dest = toISO(destination);
  const issues: EligibilityIssue[] = [];
  if (!/^[A-Z]{2}$/.test(dest)) return { ok: false, issues: [{ code: "invalid_country", field: "destination" }] };
  if (dest === "CA") return { ok: false, issues: [{ code: "domestic" }] };
  if (RESTRICTED_DESTINATIONS.has(dest)) return { ok: false, issues: [{ code: "restricted_destination", country: dest }] };

  for (const p of parcels) {
    if (!/^[A-Z]{2}$/.test(toISO(p.originCountry))) issues.push({ code: "invalid_country", field: "origin" });
    const pf: string[] = [];
    if (!(Number(p.weightG) > 0)) pf.push("weight");
    if (!(Number(p.lengthCm) > 0) || !(Number(p.widthCm) > 0) || !(Number(p.heightCm) > 0)) pf.push("dimensions");
    if (pf.length) issues.push({ code: "missing_parcel", vendorId: p.vendorId, fields: pf });
    for (const l of p.lines) {
      const f: string[] = [];
      if (!HS_RE.test(normalizeHs(l.hsCode))) f.push("hs_code");
      if (!/^[A-Z]{2}$/.test(String(l.countryOfManufacture ?? "").toUpperCase())) f.push("country_of_manufacture");
      if (!(Number(l.declaredValueCad) > 0)) f.push("declared_value");
      if (!(Number(l.weightG) > 0)) f.push("weight");
      if (f.length) issues.push({ code: "missing_customs", vendorId: p.vendorId, productId: l.productId, fields: f });
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true };
}

export type QuoteIssue =
  | "not_verified"
  | "unverified_source"
  | "not_owner"
  | "expired"
  | "lane_mismatch"
  | "ddp_missing_duties"
  | "missing_vendor"
  | "unknown_vendor"
  | "dap_not_acknowledged"
  | "negative_amount"
  | "duplicate_vendor"
  | "invalid_quote_currency"
  | "invalid_expiration"
  | "missing_fingerprint"
  | "fingerprint_mismatch";

/** Which modes may be shown for a vendor: only those backed by a verified, unexpired quote. */
export function offerableModes(quotes: LandedCostQuote[], vendorId: string, userId: string, destination: string, now = new Date()): IncotermMode[] {
  const modes = new Set<IncotermMode>();
  for (const q of quotes) {
    if (q.vendorId !== vendorId) continue;
    if (validateQuote(q, { userId, destination, now }) === null) modes.add(q.mode);
  }
  return (["DDP", "DAP"] as IncotermMode[]).filter((m) => modes.has(m));
}

export function validateQuote(q: LandedCostQuote, o: { userId: string; destination: string; now?: Date; addressFingerprint?: string; itemsFingerprint?: string; parcelFingerprint?: string; requireFingerprints?: boolean }): QuoteIssue | null {
  const now = o.now ?? new Date();
  if (!q.verified) return "not_verified";
  if (!VERIFIED_SOURCES.includes(q.source)) return "unverified_source";
  if (q.userId !== o.userId) return "not_owner";
  if (o.requireFingerprints) {
    if (!q.addressFingerprint || !q.itemsFingerprint || !q.parcelFingerprint ||
        !o.addressFingerprint || !o.itemsFingerprint || !o.parcelFingerprint) return "missing_fingerprint";
    if (q.addressFingerprint !== o.addressFingerprint || q.itemsFingerprint !== o.itemsFingerprint ||
        q.parcelFingerprint !== o.parcelFingerprint) return "fingerprint_mismatch";
  }
  const expiry = new Date(q.expiresAt).getTime();
  if (!Number.isFinite(expiry)) return "invalid_expiration";
  if (expiry <= now.getTime()) return "expired";
  if (q.providerCurrency !== "CAD" && q.providerCurrency !== "USD" && !/^[A-Z]{3}$/.test(q.providerCurrency)) return "invalid_quote_currency";
  // All *Cad fields must be converted and fixed by the trusted server; providerCurrency records the source currency.
  if (toISO(q.destinationCountry) !== toISO(o.destination)) return "lane_mismatch";
  for (const v of [q.shippingCad, q.dutiesCad ?? 0, q.importTaxCad ?? 0, q.customsFeeCad ?? 0]) {
    if (!Number.isFinite(v) || v < 0) return "negative_amount";
  }
  if (q.mode === "DDP" && (q.dutiesCad == null || q.importTaxCad == null)) return "ddp_missing_duties";
  return null;
}

/** Validate the full basket selection: one verified quote per vendor, mixed DDP/DAP allowed. */
export function validateSelection(
  selected: LandedCostQuote[],
  o: { userId: string; destination: string; vendorIds: string[]; dapAcknowledged: boolean; now?: Date; addressFingerprint?: string; itemsFingerprint?: string; parcelFingerprints?: Record<string, string>; requireFingerprints?: boolean },
): { ok: true; totalCad: number; hasDap: boolean } | { ok: false; issue: QuoteIssue; vendorId?: string } {
  const seen = new Set<string>();
  let total = 0;
  let hasDap = false;
  for (const q of selected) {
    if (!o.vendorIds.includes(q.vendorId)) return { ok: false, issue: "unknown_vendor", vendorId: q.vendorId };
    const issue = validateQuote(q, { ...o, parcelFingerprint: o.parcelFingerprints?.[q.vendorId] });
    if (issue) return { ok: false, issue, vendorId: q.vendorId };
    if (seen.has(q.vendorId)) return { ok: false, issue: "duplicate_vendor", vendorId: q.vendorId };
    seen.add(q.vendorId);
    if (q.mode === "DAP") hasDap = true;
    total += q.shippingCad + (q.customsFeeCad ?? 0) + (q.mode === "DDP" ? (q.dutiesCad ?? 0) + (q.importTaxCad ?? 0) : 0);
  }
  for (const v of o.vendorIds) if (!seen.has(v)) return { ok: false, issue: "missing_vendor", vendorId: v };
  if (hasDap && !o.dapAcknowledged) return { ok: false, issue: "dap_not_acknowledged" };
  return { ok: true, totalCad: Math.round(total * 100) / 100, hasDap };
}

/** Server gate: international payment stays closed until every integration flag is proven. */
export interface InternationalGateConfig {
  enabled: boolean;
  carrierIntegrationVerified: boolean;
  landedCostIntegrationVerified: boolean;
  exportTaxRulesVerified: boolean;
}
export const INTERNATIONAL_GATE_DEFAULT: InternationalGateConfig = {
  enabled: false,
  carrierIntegrationVerified: false,
  landedCostIntegrationVerified: false,
  exportTaxRulesVerified: false,
};
export function internationalPaymentAllowed(c: Partial<InternationalGateConfig> | null | undefined): boolean {
  return c?.enabled === true && c.carrierIntegrationVerified === true &&
    c.landedCostIntegrationVerified === true && c.exportTaxRulesVerified === true;
}
