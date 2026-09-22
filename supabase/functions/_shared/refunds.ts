// Pure refund maths. Kept Deno-free so vitest can exercise it.

export type RefundPlan =
  | { ok: true; amount_cad: number; provider_amount: number; provider_currency: string; fx_rate: number }
  | { ok: false; reason: "nothing_to_refund" | "unknown_charge" | "already_fully_refunded" };

/**
 * Orders are accounted in CAD; the customer may have been charged in another
 * currency. Convert with the rate actually used at charge time and never let the
 * total refunded exceed what was charged.
 */
export function planRefund(params: {
  lineTotalCad: number;
  alreadyRefundedCad: number;
  orderTotalCad: number;
  chargedAmount: number;
  chargedCurrency: string;
  alreadyRefundedProvider: number;
}): RefundPlan {
  const {
    lineTotalCad, alreadyRefundedCad, orderTotalCad,
    chargedAmount, chargedCurrency, alreadyRefundedProvider,
  } = params;

  const amountCad = round2(Math.max(0, lineTotalCad - alreadyRefundedCad));
  if (amountCad <= 0) return { ok: false, reason: "nothing_to_refund" };
  if (!(orderTotalCad > 0) || !(chargedAmount > 0)) return { ok: false, reason: "unknown_charge" };

  const fxRate = chargedAmount / orderTotalCad;
  const remaining = round2(chargedAmount - alreadyRefundedProvider);
  if (remaining <= 0) return { ok: false, reason: "already_fully_refunded" };

  const providerAmount = Math.min(round2(amountCad * fxRate), remaining);
  return {
    ok: true,
    amount_cad: amountCad,
    provider_amount: providerAmount,
    provider_currency: chargedCurrency || "CAD",
    fx_rate: fxRate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
