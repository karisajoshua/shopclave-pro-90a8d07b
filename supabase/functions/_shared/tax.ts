// Barakaz tax engine — pure, deterministic, no I/O. NOT ACTIVE in checkout.
// Fails CLOSED: any unknown category, unregistered component or unsupported
// jurisdiction returns { ok: false } — never a guessed zero tax.
// All amounts are integer cents. See docs/TAX_ACTIVATION_CHECKLIST.md.

export type TaxComponent = "GST" | "HST" | "PST" | "QST" | "RST";
export type TaxCategory = "taxable" | "zero_rated" | "exempt" | "unknown";

export type Province =
  | "AB" | "BC" | "MB" | "NB" | "NL" | "NS" | "NT" | "NU" | "ON" | "PE" | "QC" | "SK" | "YT";

export interface RateRule {
  province: Province;
  component: TaxComponent;
  /** Rate in basis points ×100 to stay integer: 9.975% => 99750 (per-million). */
  ratePpm: number;
  effectiveFrom: string; // YYYY-MM-DD inclusive
  effectiveTo?: string;  // YYYY-MM-DD exclusive
  /** Whether shipping charges on taxable goods attract this component. Needs advisor sign-off. */
  shippingTaxable: boolean;
}

export interface TaxConfig {
  rates: RateRule[];
  /** Components Barakaz is confirmed registered to collect, e.g. "GST", "HST", "BC:PST", "QC:QST". */
  registrations: Set<string>;
}

export interface TaxLineInput {
  id: string;
  amountCents: number; // line total (price × qty), pre-tax
  category: TaxCategory;
}

export interface TaxRequest {
  province: string;
  country: string;
  date: string; // YYYY-MM-DD (tax point)
  lines: TaxLineInput[];
  shippingCents: number;
}

export interface ComponentAmount { component: TaxComponent; ratePpm: number; baseCents: number; taxCents: number }
export interface LineTax { id: string; category: TaxCategory; components: ComponentAmount[]; taxCents: number }
export type TaxResult =
  | { ok: true; province: Province; lines: LineTax[]; shipping: ComponentAmount[]; components: ComponentAmount[]; totalTaxCents: number }
  | { ok: false; reason: string };

// CRA/provincial baseline effective as configured. Shipping flags are
// conservative defaults to be confirmed by the tax advisor before activation.
const FROM = "2019-07-01";
const hst = (p: Province, ppm: number): RateRule => ({ province: p, component: "HST", ratePpm: ppm, effectiveFrom: FROM, shippingTaxable: true });
const gst = (p: Province): RateRule => ({ province: p, component: "GST", ratePpm: 50000, effectiveFrom: FROM, shippingTaxable: true });

export const BASELINE_RATES: RateRule[] = [
  hst("ON", 130000),
  { province: "NS", component: "HST", ratePpm: 150000, effectiveFrom: FROM, effectiveTo: "2025-04-01", shippingTaxable: true },
  { province: "NS", component: "HST", ratePpm: 140000, effectiveFrom: "2025-04-01", shippingTaxable: true },
  hst("NB", 150000), hst("NL", 150000), hst("PE", 150000),
  gst("AB"), gst("BC"), gst("MB"), gst("SK"), gst("QC"), gst("NT"), gst("NU"), gst("YT"),
  { province: "BC", component: "PST", ratePpm: 70000, effectiveFrom: FROM, shippingTaxable: true },
  { province: "MB", component: "RST", ratePpm: 70000, effectiveFrom: FROM, shippingTaxable: true },
  { province: "SK", component: "PST", ratePpm: 60000, effectiveFrom: FROM, shippingTaxable: true },
  { province: "QC", component: "QST", ratePpm: 99750, effectiveFrom: FROM, shippingTaxable: true },
];

const PROVINCE_ALIASES: Record<string, Province> = {
  "alberta": "AB", "british columbia": "BC", "manitoba": "MB", "new brunswick": "NB",
  "newfoundland and labrador": "NL", "newfoundland": "NL", "nova scotia": "NS",
  "northwest territories": "NT", "nunavut": "NU", "ontario": "ON",
  "prince edward island": "PE", "quebec": "QC", "québec": "QC", "saskatchewan": "SK", "yukon": "YT",
};
const CODES = new Set<string>(Object.values(PROVINCE_ALIASES));

export function normalizeProvince(input: string): Province | null {
  const s = (input || "").trim();
  if (CODES.has(s.toUpperCase())) return s.toUpperCase() as Province;
  return PROVINCE_ALIASES[s.toLowerCase()] ?? null;
}

const isCanada = (c: string) => ["ca", "can", "canada"].includes((c || "").trim().toLowerCase());
const federal = (c: TaxComponent) => c === "GST" || c === "HST";
export const registrationKey = (p: Province, c: TaxComponent) => (federal(c) ? c : `${p}:${c}`);

/** Round half-up on non-negative integer math: cents × ppm / 1e6. */
export function taxOn(baseCents: number, ratePpm: number): number {
  if (!Number.isInteger(baseCents) || baseCents < 0) throw new Error("baseCents must be a non-negative integer");
  return Math.floor((baseCents * ratePpm + 500000) / 1000000);
}

export function rulesFor(rates: RateRule[], p: Province, date: string): RateRule[] {
  return rates.filter((r) => r.province === p && r.effectiveFrom <= date && (!r.effectiveTo || date < r.effectiveTo));
}

export function calculateTax(req: TaxRequest, cfg: TaxConfig): TaxResult {
  if (!isCanada(req.country)) return { ok: false, reason: "unsupported_country" };
  const p = normalizeProvince(req.province);
  if (!p) return { ok: false, reason: "unknown_province" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date)) return { ok: false, reason: "invalid_date" };
  if (!Number.isInteger(req.shippingCents) || req.shippingCents < 0) return { ok: false, reason: "invalid_shipping" };
  for (const l of req.lines) {
    if (!Number.isInteger(l.amountCents) || l.amountCents < 0) return { ok: false, reason: `invalid_amount:${l.id}` };
    if (!["taxable", "zero_rated", "exempt"].includes(l.category)) return { ok: false, reason: `unknown_category:${l.id}` };
  }
  const rules = rulesFor(cfg.rates, p, req.date);
  if (!rules.some((r) => federal(r.component))) return { ok: false, reason: "no_federal_rate" };
  for (const r of rules) {
    if (!cfg.registrations.has(registrationKey(p, r.component))) return { ok: false, reason: `unregistered:${registrationKey(p, r.component)}` };
  }

  const totals = new Map<TaxComponent, ComponentAmount>();
  const add = (c: ComponentAmount) => {
    const t = totals.get(c.component) ?? { component: c.component, ratePpm: c.ratePpm, baseCents: 0, taxCents: 0 };
    t.baseCents += c.baseCents; t.taxCents += c.taxCents; totals.set(c.component, t);
  };

  const lines: LineTax[] = req.lines.map((l) => {
    const components = l.category === "taxable"
      ? rules.map((r) => ({ component: r.component, ratePpm: r.ratePpm, baseCents: l.amountCents, taxCents: taxOn(l.amountCents, r.ratePpm) }))
      : [];
    components.forEach(add);
    return { id: l.id, category: l.category, components, taxCents: components.reduce((s, c) => s + c.taxCents, 0) };
  });

  // Shipping follows the goods: taxable share of shipping = shipping × taxable goods / all goods.
  const goods = req.lines.reduce((s, l) => s + l.amountCents, 0);
  const taxableGoods = req.lines.filter((l) => l.category === "taxable").reduce((s, l) => s + l.amountCents, 0);
  const taxableShipping = goods === 0 ? 0 : Math.floor((req.shippingCents * taxableGoods + Math.floor(goods / 2)) / goods);
  const shipping = rules.filter((r) => r.shippingTaxable && taxableShipping > 0)
    .map((r) => ({ component: r.component, ratePpm: r.ratePpm, baseCents: taxableShipping, taxCents: taxOn(taxableShipping, r.ratePpm) }));
  shipping.forEach(add);

  const components = [...totals.values()];
  return { ok: true, province: p, lines, shipping, components, totalTaxCents: components.reduce((s, c) => s + c.taxCents, 0) };
}
