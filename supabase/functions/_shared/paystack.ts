// Shared Paystack helpers for edge functions.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const PAYSTACK_BASE = "https://api.paystack.co";

export function paystackKey(): string {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

export async function paystackFetch(
  path: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok || body?.status === false) {
    console.error(`Paystack ${path} failed [${res.status}]:`, text);
    throw new Error(body?.message || `Paystack request failed (${res.status})`);
  }
  return body;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Currencies Paystack can charge in, mapped from buyer country. */
const COUNTRY_CURRENCY: Record<string, string> = {
  nigeria: "NGN",
  ng: "NGN",
  ghana: "GHS",
  gh: "GHS",
  "south africa": "ZAR",
  za: "ZAR",
  kenya: "KES",
  ke: "KES",
  egypt: "EGP",
  eg: "EGP",
  "cote d'ivoire": "XOF",
  "côte d'ivoire": "XOF",
  "ivory coast": "XOF",
  ci: "XOF",
};

export const SUPPORTED_CURRENCIES = ["NGN", "GHS", "ZAR", "KES", "EGP", "USD", "XOF"];

/** Currencies whose smallest unit is the major unit (no x100 subunit). */
const ZERO_SUBUNIT = new Set(["XOF"]);

export function currencyForCountry(country: string | null | undefined): string {
  if (!country) return "USD";
  const key = String(country).trim().toLowerCase();
  return COUNTRY_CURRENCY[key] ?? "USD";
}

export function toSubunit(amount: number, currency: string): number {
  if (ZERO_SUBUNIT.has(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

export function fromSubunit(amount: number, currency: string): number {
  if (ZERO_SUBUNIT.has(currency)) return Number(amount);
  return Number(amount) / 100;
}

/** Fetch CAD-based FX rates (product prices are stored in CAD). */
export async function getCadRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/CAD");
    if (!res.ok) return null;
    const data = await res.json();
    return data?.rates ?? null;
  } catch (e) {
    console.error("FX fetch failed:", e);
    return null;
  }
}

export function convertFromCAD(
  amountCAD: number,
  target: string,
  rates: Record<string, number> | null,
): number | null {
  if (target === "CAD") return amountCAD;
  const r = rates?.[target];
  if (typeof r !== "number" || !isFinite(r) || r <= 0) return null;
  return amountCAD * r;
}
