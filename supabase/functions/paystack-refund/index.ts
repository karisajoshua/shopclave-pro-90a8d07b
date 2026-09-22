import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, json, paystackFetch, toSubunit, fromSubunit } from "../_shared/paystack.ts";

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

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid return request" }, 400);
  const returnId = parsed.data.return_request_id;

  // The return row is authoritative. Never accept refund amount/reference from the browser.
  const { data: rr, error: rrErr } = await admin
    .from("return_requests")
    .select("id, order_id, order_item_id, status")
    .eq("id", returnId).single();
  if (rrErr || !rr) return json({ error: "Return request not found" }, 404);
  if (!["approved", "received", "inspected"].includes(rr.status))
    return json({ error: "Return must be approved before refund" }, 409);

  const { data: order } = await admin
    .from("orders")
    .select("id, total, paystack_reference, charged_currency, charged_amount, payment_status")
    .eq("id", rr.order_id).single();
  if (!order?.paystack_reference || order.payment_status !== "paid")
    return json({ error: "Order has no refundable verified Paystack payment" }, 409);

  const { data: item } = await admin
    .from("order_items")
    .select("id, vendor_id, price, quantity, refunded_amount, refunded_amount_provider")
    .eq("id", rr.order_item_id).eq("order_id", rr.order_id).single();
  if (!item) return json({ error: "Return item not found" }, 404);

  // Conservative default: refund merchandise value only. Shipping stays non-refundable
  // unless a later admin policy explicitly changes this server-side.
  const { data: priorRefunds } = await admin
    .from("payment_refunds")
    .select("provider_amount, status")
    .eq("order_id", order.id)
    .in("status", ["processing", "pending", "processed"]);
  const alreadyRefundedProvider = (priorRefunds ?? []).reduce(
    (sum, r) => sum + Number(r.provider_amount || 0), 0,
  );

  const plan = planRefund({
    lineTotalCad: Number(item.price) * Number(item.quantity),
    alreadyRefundedCad: Number(item.refunded_amount || 0),
    orderTotalCad: Number(order.total || 0),
    chargedAmount: Number(order.charged_amount || 0),
    chargedCurrency: order.charged_currency || "CAD",
    alreadyRefundedProvider,
  });
  if (!plan.ok) {
    const messages: Record<string, string> = {
      nothing_to_refund: "Nothing remains to refund",
      unknown_charge: "Original charge amount is unknown; cannot refund safely",
      already_fully_refunded: "Order is already fully refunded",
    };
    return json({ error: messages[plan.reason] }, 409);
  }
  const { amount_cad: amountCad, provider_amount: providerAmount, provider_currency: providerCurrency, fx_rate: fxRate } = plan;

  // Claim idempotency before contacting Paystack.
  const { data: refundRow, error: claimErr } = await admin
    .from("payment_refunds")
    .insert({
      return_request_id: returnId,
      order_id: rr.order_id,
      order_item_id: item.id,
      paystack_reference: order.paystack_reference,
      amount: amountCad,
      currency: "CAD",
      provider_amount: providerAmount,
      provider_currency: providerCurrency,
      fx_rate_used: fxRate,
      status: "processing",
      requested_by: user.id,
    })
    .select().single();

  let refund = refundRow;
  if (claimErr?.code === "23505") {
    const { data: existing } = await admin
      .from("payment_refunds").select("*").eq("return_request_id", returnId).single();
    // Only a previously failed attempt may be retried; in-flight or settled
    // refunds are reported back untouched so retries stay safe.
    if (!existing || existing.status !== "failed") {
      return json({ refund: existing, duplicate: true }, 200);
    }
    const { data: reclaimed } = await admin
      .from("payment_refunds")
      .update({
        status: "processing", failure_reason: null,
        amount: amountCad, provider_amount: providerAmount,
        provider_currency: providerCurrency, fx_rate_used: fxRate,
        requested_by: user.id,
      })
      .eq("id", existing.id).eq("status", "failed")
      .select().single();
    if (!reclaimed) return json({ refund: existing, duplicate: true }, 200);
    refund = reclaimed;
  }
  if (!refund) {
    console.error("Refund claim failed:", claimErr);
    return json({ error: "Could not start refund" }, 500);
  }

  try {
    const result = await paystackFetch("/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction: order.paystack_reference,
        amount: toSubunit(providerAmount, providerCurrency),
        currency: providerCurrency,
        merchant_note: `Barakaz return ${returnId}`,
        customer_note: "Refund for approved return",
      }),
    });

    const provider = result?.data ?? {};
    // Paystack acknowledges the request; settlement is confirmed later by the
    // refund.processed webhook. Treat anything else as still in flight.
    const providerStatus = String(provider?.status ?? "pending").toLowerCase();
    const settled = providerStatus === "processed" || providerStatus === "success";
    const confirmedAmount = provider?.amount != null
      ? fromSubunit(provider.amount, provider?.currency ?? providerCurrency)
      : providerAmount;

    await admin.from("payment_refunds").update({
      status: settled ? "processed" : "pending",
      provider_refund_id: provider?.id ? String(provider.id) : null,
      provider_amount: confirmedAmount,
      provider_currency: provider?.currency ?? providerCurrency,
      provider_payload: result,
    }).eq("id", refund.id);

    // Reserve the amount against the line immediately so a second request cannot
    // refund the same money while the first is still in flight.
    await admin.from("order_items").update({
      refunded_amount: Number(item.refunded_amount || 0) + amountCad,
      refunded_amount_provider: Number(item.refunded_amount_provider || 0) + confirmedAmount,
    }).eq("id", item.id);

    await admin.from("return_requests").update({
      status: settled ? "refunded" : "refund_processing",
      refund_amount_cad: amountCad,
      refund_reference: provider?.id ? String(provider.id) : order.paystack_reference,
    }).eq("id", returnId);

    if (settled) {
      await admin.from("vendor_ledger").upsert({
        vendor_id: item.vendor_id,
        order_item_id: item.id,
        entry_type: "refund",
        amount: -amountCad,
        currency: "CAD",
        stripe_reference: provider?.id ? String(provider.id) : order.paystack_reference,
        status: "available",
        notes: `Refund for return ${returnId}`,
      }, { onConflict: "order_item_id,entry_type", ignoreDuplicates: true });
    }

    return json({
      refund_id: refund.id,
      status: settled ? "processed" : "pending",
      amount_cad: amountCad,
      provider_amount: confirmedAmount,
      provider_currency: provider?.currency ?? providerCurrency,
    });
  } catch (e) {
    await admin.from("payment_refunds").update({
      status: "failed", failure_reason: e instanceof Error ? e.message : String(e),
    }).eq("id", refund.id);
    console.error("Paystack refund failed:", e);
    return json({ error: "Refund provider request failed" }, 502);
  }
});
