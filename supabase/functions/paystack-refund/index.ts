import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, json, paystackFetch, toSubunit } from "../_shared/paystack.ts";

const Schema = z.object({ return_request_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, serviceKey);
  const { data: role } = await admin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Admin access required" }, 403);

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return json({ error: "Invalid return request" }, 400);
  const returnId = parsed.data.return_request_id;

  // The return row is authoritative. Never accept refund amount/reference from the browser.
  const { data: rr, error: rrErr } = await admin
    .from("return_requests")
    .select("id, order_id, order_item_id, status")
    .eq("id", returnId).single();
  if (rrErr || !rr) return json({ error: "Return request not found" }, 404);
  if (rr.status !== "approved") return json({ error: "Return must be approved before refund" }, 409);

  const { data: order } = await admin
    .from("orders")
    .select("id, paystack_reference, charged_currency, charged_amount, payment_status")
    .eq("id", rr.order_id).single();
  if (!order?.paystack_reference || order.payment_status !== "paid")
    return json({ error: "Order has no refundable verified Paystack payment" }, 409);

  const { data: item } = await admin
    .from("order_items")
    .select("id, price, quantity, shipping_amount, refunded_amount")
    .eq("id", rr.order_item_id).eq("order_id", rr.order_id).single();
  if (!item) return json({ error: "Return item not found" }, 404);

  // Conservative default: refund merchandise value only. Shipping stays non-refundable
  // unless a later admin policy explicitly changes this server-side.
  const amount = Math.max(0, Number(item.price) * Number(item.quantity) - Number(item.refunded_amount || 0));
  if (amount <= 0) return json({ error: "Nothing remains to refund" }, 409);
  const currency = order.charged_currency || "CAD";

  // Claim idempotency before contacting Paystack.
  const { data: refundRow, error: claimErr } = await admin
    .from("payment_refunds")
    .insert({
      return_request_id: returnId, order_id: rr.order_id,
      paystack_reference: order.paystack_reference, amount, currency,
      status: "processing", requested_by: user.id,
    })
    .select().single();

  if (claimErr?.code === "23505") {
    const { data: existing } = await admin
      .from("payment_refunds").select("*").eq("return_request_id", returnId).single();
    return json({ refund: existing, duplicate: true }, 200);
  }
  if (claimErr || !refundRow) return json({ error: "Could not start refund" }, 500);

  try {
    const result = await paystackFetch("/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction: order.paystack_reference,
        amount: toSubunit(amount, currency),
        currency,
        merchant_note: `ShopClave return ${returnId}`,
        customer_note: "Refund for approved return",
      }),
    });

    const provider = result?.data ?? {};
    await admin.from("payment_refunds").update({
      status: "processed",
      provider_refund_id: provider?.id ? String(provider.id) : null,
      provider_payload: result,
      updated_at: new Date().toISOString(),
    }).eq("id", refundRow.id);

    await admin.from("order_items").update({
      refunded_amount: Number(item.refunded_amount || 0) + amount,
    }).eq("id", item.id);

    await admin.from("return_requests").update({ status: "refunded" }).eq("id", returnId);

    // Reverse platform-held vendor credit where applicable. Unique refund record above
    // makes this path execute once per return.
    await admin.from("vendor_ledger").insert({
      vendor_id: (await admin.from("order_items").select("vendor_id").eq("id", item.id).single()).data?.vendor_id,
      order_item_id: item.id,
      entry_type: "refund",
      amount: -amount,
      currency: "CAD",
      stripe_reference: provider?.id ? String(provider.id) : order.paystack_reference,
      status: "available",
      notes: `Refund for return ${returnId}`,
    });

    return json({ refund_id: refundRow.id, status: "processed" });
  } catch (e) {
    await admin.from("payment_refunds").update({
      status: "failed", failure_reason: e instanceof Error ? e.message : String(e),
      updated_at: new Date().toISOString(),
    }).eq("id", refundRow.id);
    console.error("Paystack refund failed:", e);
    return json({ error: "Refund provider request failed" }, 502);
  }
});
