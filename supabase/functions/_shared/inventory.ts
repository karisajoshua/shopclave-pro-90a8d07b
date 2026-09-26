// Pure helpers for the (not yet wired) reservation flow. No DB access.
export interface CartLine { product_id: string; variant_id: string | null; vendor_id: string; quantity: number }

// Merge duplicate lines and sort deterministically (matches SQL lock order).
export function normalizeLines(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) throw new Error("invalid quantity");
    const k = `${l.product_id}|${l.variant_id ?? ""}`;
    const prev = map.get(k);
    if (prev && prev.vendor_id !== l.vendor_id) throw new Error("vendor mismatch");
    map.set(k, prev ? { ...prev, quantity: prev.quantity + l.quantity } : { ...l });
  }
  return [...map.values()].sort((a, b) =>
    a.product_id.localeCompare(b.product_id) || (a.variant_id ?? "").localeCompare(b.variant_id ?? ""));
}

// Stable key: same user + same cart/address/delivery → same key, so retries reuse one order.
export async function idempotencyKey(userId: string, lines: CartLine[], addressFp: string, quoteIds: string[]): Promise<string> {
  const payload = JSON.stringify([userId, normalizeLines(lines), addressFp, [...quoteIds].sort()]);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ReservationStatus = "reserved" | "committed" | "released";
export type PaymentEvent = "paid" | "failed" | "expired" | "cancelled";

// Transition rules mirrored by the SQL functions.
export function nextReservationStatus(current: ReservationStatus, ev: PaymentEvent): ReservationStatus {
  if (current !== "reserved") return current; // committed/released are terminal (replay-safe)
  return ev === "paid" ? "committed" : "released";
}
