// Stripe hosted-checkout handoff helpers. Pure and side-effect free except logHandoff.

/** Returns the URL only if it is an https Stripe Checkout address; otherwise null. */
export const validateStripeCheckoutUrl = (url: unknown): string | null => {
  if (typeof url !== "string" || !url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!/(^|\.)stripe\.com$/.test(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

export type HandoffEvent =
  | "popup_blocked"
  | "auto_redirect_started"
  | "auto_redirect_stalled"
  | "manual_continue_clicked"
  | "manual_open_blocked"
  | "invalid_checkout_url"
  | "initialize_failed";

/** Non-PII telemetry: never pass checkout URLs, emails, addresses or tokens. */
export const logHandoff = (event: HandoffEvent, detail: { framed?: boolean; orderRef?: string; reason?: string } = {}) => {
  const safe = {
    framed: detail.framed,
    orderRef: detail.orderRef ? detail.orderRef.slice(0, 8).toUpperCase() : undefined,
    reason: detail.reason?.slice(0, 120),
  };
  console.warn(`[stripe-handoff] ${event}`, safe);
};
