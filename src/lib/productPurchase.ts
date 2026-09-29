// Pure purchase-decision helpers for the product page. No defaults are guessed:
// a variant product can only be bought once every option is explicitly chosen.
export type VariantLike = { id: string; stock?: number | null; variant_options?: Record<string, string> | null };

/** Keep only still-valid selections; auto-pick an option only when it has exactly one value. */
export function normalizeSelection(optionTypes: Record<string, string[]>, current: Record<string, string>) {
  const next: Record<string, string> = {};
  for (const [key, values] of Object.entries(optionTypes)) {
    if (current[key] && values.includes(current[key])) next[key] = current[key];
    else if (values.length === 1) next[key] = values[0];
  }
  return next;
}

export function resolveVariant(variants: VariantLike[], optionKeys: string[], selected: Record<string, string>) {
  if (!optionKeys.length || !optionKeys.every((k) => selected[k] != null)) return null;
  return variants.find((v) => optionKeys.every((k) => (v.variant_options || {})[k] === selected[k])) ?? null;
}

/** A value is available if some in-stock variant matches it plus the other chosen options. */
export function isOptionValueAvailable(variants: VariantLike[], selected: Record<string, string>, key: string, value: string) {
  return variants.some((v) => {
    const o = v.variant_options || {};
    if (o[key] !== value) return false;
    if ((v.stock ?? 0) <= 0) return false;
    return Object.entries(selected).every(([k, val]) => k === key || o[k] === val);
  });
}

export type PurchaseReason = "select_options" | "unavailable" | "out_of_stock";
export type PurchaseState = { canBuy: boolean; maxQty: number; reason: PurchaseReason | null };

export function getPurchaseState(opts: {
  hasVariants: boolean; optionKeys: string[]; selected: Record<string, string>;
  variant: VariantLike | null; productStock: number | null | undefined;
}): PurchaseState {
  if (opts.hasVariants) {
    if (!opts.optionKeys.every((k) => opts.selected[k] != null)) return { canBuy: false, reason: "select_options", maxQty: 0 };
    if (!opts.variant) return { canBuy: false, reason: "unavailable", maxQty: 0 };
    const s = opts.variant.stock ?? 0;
    return s > 0 ? { canBuy: true, maxQty: s, reason: null } : { canBuy: false, reason: "out_of_stock", maxQty: 0 };
  }
  const s = opts.productStock ?? 0;
  return s > 0 ? { canBuy: true, maxQty: s, reason: null } : { canBuy: false, reason: "out_of_stock", maxQty: 0 };
}

export function clampQuantity(qty: number, maxQty: number) {
  if (maxQty <= 0) return 1;
  if (!Number.isFinite(qty)) return 1;
  return Math.min(Math.max(1, Math.floor(qty)), maxQty);
}

/** Existing cart quantity for this product/variant counts toward the stock cap. */
export function remainingForCart(maxQty: number, inCart: number) {
  return Math.max(0, maxQty - inCart);
}

export const PURCHASE_REASON_TEXT: Record<PurchaseReason, string> = {
  select_options: "Choose your options",
  unavailable: "This combination isn't available",
  out_of_stock: "Out of stock",
};

export const purchaseMessage = (p: PurchaseState) => (p.reason ? PURCHASE_REASON_TEXT[p.reason] : "");
