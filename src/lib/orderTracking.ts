// Carrier/tracking details are only shown once a parcel has actually shipped.
const SHIPPED_STATUSES = new Set([
  "collected", "in_transit", "customs_clearance", "out_for_delivery", "delivered", "exception", "returned",
]);

export function hasShipped(status: string | null | undefined): boolean {
  return !!status && SHIPPED_STATUSES.has(status);
}

export const CHECKOUT_MODE_LABEL = "Sandbox checkout — test payments only. Taxes are not yet charged.";
