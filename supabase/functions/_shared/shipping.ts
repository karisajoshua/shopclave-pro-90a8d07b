// Pure, dependency-free shipping helpers.
// Kept free of Deno globals so they can be unit-tested with vitest.

export const SHIPMENT_STATUSES = [
  "preparing",
  "ready_for_pickup",
  "collected",
  "in_transit",
  "customs_clearance",
  "out_for_delivery",
  "delivered",
  "exception",
  "returned",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  preparing: "Preparing",
  ready_for_pickup: "Ready for Pickup",
  collected: "Collected",
  in_transit: "In Transit",
  customs_clearance: "Customs Clearance",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  exception: "Delivery Exception",
  returned: "Returned",
};

/** Map a Shippo tracking status onto a canonical Barakaz status. */
export function mapShippoStatus(
  trackingStatus: string | null | undefined,
  substatus?: string | null,
): ShipmentStatus {
  const s = (trackingStatus || "").toUpperCase();
  const sub = (substatus || "").toLowerCase();

  if (s === "DELIVERED") return "delivered";
  if (s === "RETURNED") return "returned";
  if (s === "FAILURE" || s === "FAILED") return "exception";
  if (s === "PRE_TRANSIT") return "ready_for_pickup";
  if (s === "TRANSIT") {
    if (sub.includes("customs")) return "customs_clearance";
    if (sub.includes("out_for_delivery") || sub.includes("delivery_scheduled")) return "out_for_delivery";
    return "in_transit";
  }
  if (s === "UNKNOWN" || s === "") return "preparing";
  return "in_transit";
}

/** Statuses a vendor may set by hand (everything else is carrier-driven). */
export const VENDOR_SETTABLE_STATUSES: ShipmentStatus[] = [
  "preparing",
  "ready_for_pickup",
  "collected",
];

export const RETURN_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "label_issued",
  "in_transit_back",
  "received",
  "inspected",
  "refund_approved",
  "refund_rejected",
  "refunded",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

/** Allowed return-workflow transitions. */
export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["label_issued", "in_transit_back", "rejected"],
  rejected: [],
  label_issued: ["in_transit_back"],
  in_transit_back: ["received"],
  received: ["inspected"],
  inspected: ["refund_approved", "refund_rejected"],
  refund_approved: ["refunded"],
  refund_rejected: [],
  refunded: [],
};

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return (RETURN_TRANSITIONS[from] ?? []).includes(to);
}

// ---------------------------------------------------------------
// Currency
// ---------------------------------------------------------------

/**
 * Normalize a carrier amount into CAD. `rates` maps CAD -> currency
 * (i.e. 1 CAD = rates[X] of X), matching open.er-api.com/v6/latest/CAD.
 * Returns null when the currency is unknown, so callers can fail loudly
 * rather than adding mismatched currencies together.
 */
export function normalizeToCad(
  amount: number,
  currency: string,
  rates: Record<string, number>,
): { amount_cad: number; fx_rate_to_cad: number } | null {
  const code = (currency || "").toUpperCase();
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (code === "CAD") return { amount_cad: round2(amount), fx_rate_to_cad: 1 };
  const perCad = rates[code];
  if (!perCad || !Number.isFinite(perCad) || perCad <= 0) return null;
  const fx = 1 / perCad; // 1 unit of `code` = fx CAD
  return { amount_cad: round2(amount * fx), fx_rate_to_cad: fx };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------
// Vendor origin validation
// ---------------------------------------------------------------

export interface WarehouseAddress {
  street1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

/** Countries where a postal code is required by carriers. */
const POSTAL_REQUIRED = new Set(["US", "CA", "GB", "DE", "FR", "AU", "IN", "CN", "NL", "ES", "IT"]);
/** Countries where a state/province is required. */
const STATE_REQUIRED = new Set(["US", "CA", "AU", "IN"]);

export function validateWarehouse(
  wh: WarehouseAddress | null | undefined,
): { valid: true } | { valid: false; missing: string[] } {
  const missing: string[] = [];
  const a = wh ?? {};
  if (!a.street1?.trim()) missing.push("street address");
  if (!a.city?.trim()) missing.push("city");
  if (!a.country?.trim()) missing.push("country");
  if (!a.phone?.trim()) missing.push("phone number");
  const iso = toISO(a.country || "");
  if (STATE_REQUIRED.has(iso) && !a.state?.trim()) missing.push("state/province");
  if (POSTAL_REQUIRED.has(iso) && !a.zip?.trim()) missing.push("postal code");
  return missing.length === 0 ? { valid: true } : { valid: false, missing };
}

// ---------------------------------------------------------------
// Parcel / dimensions
// ---------------------------------------------------------------

export interface ProductDims {
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  name?: string | null;
}

export interface DefaultPackagePolicy {
  enabled: boolean;
  weight_g: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
}

export const NO_DEFAULT_PACKAGE_POLICY: DefaultPackagePolicy = {
  enabled: false,
  weight_g: 0,
  length_cm: 0,
  width_cm: 0,
  height_cm: 0,
};

/**
 * Build a combined parcel for a vendor's items. Missing dimensions are NEVER
 * invented unless an administrator has enabled an explicit default-package policy.
 */
export function buildParcel(
  lines: Array<{ product: ProductDims; quantity: number }>,
  policy: DefaultPackagePolicy,
):
  | { ok: true; parcel: { weight_g: number; length_cm: number; width_cm: number; height_cm: number }; usedDefaults: boolean }
  | { ok: false; missingFor: string[] } {
  const missingFor: string[] = [];
  let usedDefaults = false;
  let weight = 0;
  let L = 0;
  let W = 0;
  let H = 0;

  for (const { product, quantity } of lines) {
    const incomplete =
      !product.weight_g || !product.length_cm || !product.width_cm || !product.height_cm;
    if (incomplete) {
      if (!policy.enabled) {
        missingFor.push(product.name || "product");
        continue;
      }
      usedDefaults = true;
    }
    weight += Number(product.weight_g || policy.weight_g) * quantity;
    L = Math.max(L, Number(product.length_cm || policy.length_cm));
    W = Math.max(W, Number(product.width_cm || policy.width_cm));
    H = Math.max(H, Number(product.height_cm || policy.height_cm));
  }

  if (missingFor.length > 0) return { ok: false, missingFor };
  if (weight <= 0 || L <= 0 || W <= 0 || H <= 0) {
    return { ok: false, missingFor: lines.map((l) => l.product.name || "product") };
  }
  return {
    ok: true,
    parcel: { weight_g: Math.ceil(weight), length_cm: L, width_cm: W, height_cm: H },
    usedDefaults,
  };
}

// ---------------------------------------------------------------
// Quote validation
// ---------------------------------------------------------------

export interface QuoteRecord {
  id: string;
  user_id: string;
  vendor_id: string;
  expires_at: string;
  consumed_order_id: string | null;
  address_fingerprint: string;
  items_fingerprint: string;
  amount_cad: number;
}

export type QuoteRejection =
  | "not_found"
  | "not_owner"
  | "expired"
  | "already_used"
  | "address_changed"
  | "items_changed"
  | "vendor_mismatch"
  | "missing_vendor";

export function validateQuotes(
  quotes: QuoteRecord[],
  opts: {
    userId: string;
    requiredVendorIds: string[];
    addressFingerprint: string;
    itemsFingerprint: string;
    now?: Date;
  },
): { ok: true; totalCad: number } | { ok: false; reason: QuoteRejection; detail?: string } {
  const now = opts.now ?? new Date();
  const seen = new Set<string>();

  for (const q of quotes) {
    if (q.user_id !== opts.userId) return { ok: false, reason: "not_owner" };
    if (q.consumed_order_id) return { ok: false, reason: "already_used", detail: q.id };
    if (new Date(q.expires_at).getTime() <= now.getTime()) {
      return { ok: false, reason: "expired", detail: q.id };
    }
    if (q.address_fingerprint !== opts.addressFingerprint) {
      return { ok: false, reason: "address_changed" };
    }
    if (q.items_fingerprint !== opts.itemsFingerprint) {
      return { ok: false, reason: "items_changed" };
    }
    if (!opts.requiredVendorIds.includes(q.vendor_id)) {
      return { ok: false, reason: "vendor_mismatch", detail: q.vendor_id };
    }
    seen.add(q.vendor_id);
  }

  for (const v of opts.requiredVendorIds) {
    if (!seen.has(v)) return { ok: false, reason: "missing_vendor", detail: v };
  }

  return { ok: true, totalCad: round2(quotes.reduce((s, q) => s + Number(q.amount_cad), 0)) };
}

// ---------------------------------------------------------------
// Fingerprints + ISO helpers
// ---------------------------------------------------------------

const COUNTRY_TO_ISO: Record<string, string> = {
  kenya: "KE",
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  uganda: "UG",
  tanzania: "TZ",
  rwanda: "RW",
  nigeria: "NG",
  "south africa": "ZA",
  ghana: "GH",
  ethiopia: "ET",
  egypt: "EG",
  india: "IN",
  china: "CN",
  germany: "DE",
  france: "FR",
  canada: "CA",
  australia: "AU",
};

export function toISO(c: string): string {
  if (!c) return "";
  const t = c.trim();
  if (t.length === 2) return t.toUpperCase();
  return COUNTRY_TO_ISO[t.toLowerCase()] ?? t.slice(0, 2).toUpperCase();
}

export interface AddressLike {
  fullName?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function addressFingerprint(a: AddressLike): string {
  return [norm(a.addressLine), norm(a.city), norm(a.state), norm(a.zip), toISO(String(a.country ?? ""))].join("|");
}

export function itemsFingerprint(
  items: Array<{ product_id: string; variant_id?: string | null; quantity: number }>,
): string {
  return items
    .map((i) => `${i.product_id}:${i.variant_id ?? ""}:${i.quantity}`)
    .sort()
    .join(",");
}

export const QUOTE_TTL_MINUTES = 30;
