// Pure helpers for admin dashboard accuracy.
// - fetchAllRows: pages past the 1000-row API cap and THROWS on error
//   (so the UI shows a failure instead of a misleading zero).
// - Financial metrics count only payment-confirmed orders (payment_status = 'paid').

export const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = PAGE_SIZE,
  maxPages = 100,
): Promise<T[]> {
  const out: T[] = [];
  for (let p = 0; p < maxPages; p++) {
    const from = p * pageSize;
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
  throw new Error("Too many rows to load safely; narrow the date range.");
}

export interface OrderRow { id: string; created_at: string; total: number | string; payment_status: string; status: string }
export interface ItemRow {
  order_id: string; created_at: string; price: number | string; quantity: number;
  commission_amount: number | string; vendor_payout?: number | string | null; refunded_amount?: number | string | null;
}

export const isPaid = (o: Pick<OrderRow, "payment_status">) => o.payment_status === "paid";

export function computeFinancials(orders: OrderRow[], items: ItemRow[], cutoff: Date) {
  const inWindow = (d: string) => new Date(d) > cutoff;
  const paidIds = new Set(orders.filter((o) => isPaid(o) && inWindow(o.created_at)).map((o) => o.id));
  const windowOrders = orders.filter((o) => inWindow(o.created_at));
  const paidItems = items.filter((i) => paidIds.has(i.order_id));
  const n = (v: unknown) => Number(v) || 0;
  const gross = windowOrders.filter(isPaid).reduce((s, o) => s + n(o.total), 0);
  const refunds = paidItems.reduce((s, i) => s + n(i.refunded_amount), 0);
  const commission = paidItems.reduce((s, i) => s + n(i.commission_amount), 0);
  const vendorEarnings = paidItems.reduce((s, i) => s + n(i.vendor_payout), 0);
  return {
    totalOrders: windowOrders.length,
    paidOrders: paidIds.size,
    pendingPaymentOrders: windowOrders.filter((o) => o.payment_status === "pending").length,
    cancelledOrders: windowOrders.filter((o) => o.status === "cancelled").length,
    grossPaidSales: round2(gross),
    refunds: round2(refunds),
    netSales: round2(gross - refunds),
    commission: round2(commission),
    vendorEarnings: round2(vendorEarnings),
    paidIds,
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
