// Fail-closed guard: live Stripe checkout stays blocked until server-authoritative
// tax is implemented, reconciled and the operator explicitly opts in.
export function isLiveStripeKey(key: string | undefined | null): boolean {
  return !!key && /^(sk|rk)_live_/.test(key);
}

export function liveCheckoutAllowed(key: string | undefined | null, flag: string | undefined | null): boolean {
  if (!isLiveStripeKey(key)) return true; // test-mode keys unaffected
  return flag === "true";
}
