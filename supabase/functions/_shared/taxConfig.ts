// Loads the Canadian tax configuration (effective-dated rates + confirmed
// registrations) from the database. Fails closed: if nothing is configured,
// the engine returns { ok: false } and no tax — and therefore no charge — is made.
import type { RateRule, TaxComponent, TaxConfig, Province } from "./tax.ts";

export const TAX_ENGINE_VERSION = "2026.09-ca-1";

type Client = { from: (t: string) => any };

export async function loadTaxConfig(admin: Client, allowUnapproved = false): Promise<TaxConfig> {
  const [{ data: rateRows, error: rateError }, { data: regRows, error: regError }] = await Promise.all([
    admin.from("tax_rates").select("province,component,rate_ppm,effective_from,effective_to,shipping_taxable"),
    admin.from("tax_registrations").select("key,effective_from,effective_to,registration_number,approved_at,approved_by"),
  ]);

  if (rateError || regError) throw new Error("Tax configuration unavailable");
  const rates: RateRule[] = (rateRows || []).map((r: any) => ({
    province: r.province as Province,
    component: r.component as TaxComponent,
    ratePpm: Number(r.rate_ppm),
    effectiveFrom: String(r.effective_from),
    effectiveTo: r.effective_to ? String(r.effective_to) : undefined,
    shippingTaxable: Boolean(r.shipping_taxable),
  }));

  const registrations = new Set<string>();
  const registrationEffectiveFrom: Record<string, string> = {};
  const today = new Date().toISOString().slice(0, 10);
  for (const r of regRows || []) {
    if (!allowUnapproved && (!r.approved_at || !r.approved_by || !String(r.registration_number || "").trim())) continue;
    if (r.effective_to && String(r.effective_to) <= today) continue;
    registrations.add(String(r.key));
    if (r.effective_from) registrationEffectiveFrom[String(r.key)] = String(r.effective_from);
  }

  return { rates, registrations, registrationEffectiveFrom };
}

/** Customer-facing explanation for a fail-closed tax result. */
export function taxErrorMessage(reason: string): string {
  if (reason.startsWith("unregistered:")) {
    return "We can't yet calculate sales tax for this delivery province, so checkout is unavailable there. You have not been charged.";
  }
  if (reason.startsWith("registration_not_effective")) {
    return "Sales tax collection is not active for this date. You have not been charged.";
  }
  if (reason === "unsupported_country") {
    return "We currently deliver within Canada only. You have not been charged.";
  }
  if (reason === "unknown_province") {
    return "Please select a valid Canadian province or territory.";
  }
  if (reason.startsWith("unknown_category")) {
    return "One of the items is missing its tax classification. Please contact support — you have not been charged.";
  }
  return "Sales tax could not be calculated, so checkout is unavailable right now. You have not been charged.";
}
