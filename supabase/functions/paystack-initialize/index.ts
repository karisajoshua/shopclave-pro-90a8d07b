import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import {
  corsHeaders,
  json,
  paystackFetch,
  currencyForCountry,
  toSubunit,
  getCadRates,
  convertFromCAD,
} from "../_shared/paystack.ts";

const BodySchema = z.object({
  order_id: z.string().uuid(),
  return_path: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { order_id } = parsed.data;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, user_id, shipping_address, payment_status, shipping_total, paystack_reference")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) return json({ error: "Order not found" }, 404);
    if (order.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (order.payment_status === "paid") return json({ error: "Order already paid" }, 400);

    // Recompute the amount server-side — never trust the client.
    const { data: items, error: itemsErr } = await admin
      .from("order_items")
      .select("id, vendor_id, price, quantity, vendor_payout, shipping_amount")
      .eq("order_id", order_id);
    if (itemsErr || !items || items.length === 0) return json({ error: "No order items" }, 400);

    const shippingTotalCAD = items.reduce((s, it) => s + Number(it.shipping_amount || 0), 0);
    const itemsTotalCAD = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
    const totalCAD = itemsTotalCAD + shippingTotalCAD;
    if (totalCAD <= 0) return json({ error: "Order total must be greater than zero" }, 400);

    // Paystack cannot settle CAD — convert to the buyer's supported currency.
    const shipping = order.shipping_address as Record<string, unknown> | null;
    const currency = currencyForCountry(shipping?.country as string | undefined);
    const rates = await getCadRates();
    const converted = convertFromCAD(totalCAD, currency, rates);
    if (converted === null) {
      return json({ error: "Currency conversion is unavailable right now. Please try again." }, 503);
    }
    const chargedAmount = Math.round(converted * 100) / 100;

    // Build the per-vendor split from connected Paystack subaccounts.
    const vendorIds = [...new Set(items.map((i) => i.vendor_id))];
    const { data: accounts } = await admin
      .from("vendor_paystack_accounts")
      .select("vendor_id, subaccount_code, active")
      .in("vendor_id", vendorIds);

    const subaccounts: { subaccount: string; share: number }[] = [];
    for (const vendorId of vendorIds) {
      const acct = accounts?.find((a) => a.vendor_id === vendorId && a.active);
      if (!acct?.subaccount_code) continue; // platform-collected, settled via ledger
      const payoutCAD = items
        .filter((i) => i.vendor_id === vendorId)
        .reduce((s, i) => s + Number(i.vendor_payout || 0) + Number(i.shipping_amount || 0), 0);
      if (payoutCAD <= 0) continue;
      const payoutLocal = convertFromCAD(payoutCAD, currency, rates);
      if (payoutLocal === null) continue;
      const share = toSubunit(payoutLocal, currency);
      if (share <= 0) continue;
      subaccounts.push({ subaccount: acct.subaccount_code, share });
    }

    const totalSubunit = toSubunit(chargedAmount, currency);
    // Never let the split exceed what is being charged.
    const shareSum = subaccounts.reduce((s, x) => s + x.share, 0);
    const useSplit = subaccounts.length > 0 && shareSum > 0 && shareSum < totalSubunit;

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://barakaz.com";
    const reference = `bkz_${order_id.replace(/-/g, "")}_${Date.now()}`;
    const email =
      (shipping?.email && String(shipping.email).trim()) || user.email || `${user.id}@no-reply.barakaz.com`;

    const payload: Record<string, unknown> = {
      email,
      amount: totalSubunit,
      currency,
      reference,
      callback_url: `${origin}/order-confirmation/${order_id}`,
      metadata: { order_id, user_id: user.id, cad_total: totalCAD },
    };
    if (useSplit) {
      payload.split = {
        type: "flat",
        currency,
        bearer_type: "account",
        subaccounts,
      };
    }

    const result = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await admin
      .from("orders")
      .update({
        paystack_reference: reference,
        charged_currency: currency,
        charged_amount: chargedAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    return json({
      url: result?.data?.authorization_url,
      reference,
      currency,
      amount: chargedAmount,
    });
  } catch (err) {
    console.error("paystack-initialize error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
