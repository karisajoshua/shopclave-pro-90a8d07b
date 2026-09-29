// Fail-closed guard: live Stripe checkout stays blocked until server-authoritative
// tax is implemented, reconciled and the operator explicitly opts in.
export function isLiveStripeKey(key: string | undefined | null): boolean {
  return !!key && /^(sk|rk)_live_/.test(key);
}

export function liveCheckoutAllowed(key: string | undefined | null, flag: string | undefined | null): boolean {
  if (!isLiveStripeKey(key)) return true; // test-mode keys unaffected
  return flag === "true";
}

export type StripeKeyMode = "test" | "live" | "invalid";

/** Classify a Stripe secret/restricted key by prefix only. Never logs or returns key material. */
export function classifyStripeKey(key: string | undefined | null): StripeKeyMode {
  if (!key) return "invalid";
  if (/^(sk|rk)_test_\S+$/.test(key)) return "test";
  if (/^(sk|rk)_live_\S+$/.test(key)) return "live";
  return "invalid";
}

/** Live Connect requires an explicit, separate opt-in flag equal to exactly "true". */
export function connectKeyAllowed(key: string | undefined | null, liveConnectFlag: string | undefined | null):
  { ok: true; mode: "test" | "live" } | { ok: false; reason: "invalid" | "live_disabled" } {
  const mode = classifyStripeKey(key);
  if (mode === "invalid") return { ok: false, reason: "invalid" };
  if (mode === "live" && liveConnectFlag !== "true") return { ok: false, reason: "live_disabled" };
  return { ok: true, mode };
}
