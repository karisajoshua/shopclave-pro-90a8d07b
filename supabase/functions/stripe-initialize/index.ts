import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const Body = z.object({ order_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid order id" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order } = await admin.from("orders")
      .select("id,user_id,payment_status,shipping_address,stripe_checkout_session_id")
      .eq("id", parsed.data.order_id).maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);
    if (order.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (order.payment_status === "paid") return json({ error: "Order already paid" }, 400);

    // Retry: reuse a still-open Stripe session rather than creating a new one.
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (secretKey && order.stripe_checkout_session_id) {
      const existing = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.stripe_checkout_session_id)}`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      ).then((r) => r.ok ? r.json() : null).catch(() => null);
      if (existing?.status === "open" && existing?.url) {
        return json({ url: existing.url, session_id: existing.id, currency: "CAD", amount: Number(existing.amount_total) / 100 });
      }
    }

    const { data: items, error: itemsErr } = await admin.from("order_items")
      .select("price,quantity,shipping_amount").eq("order_id", order.id);
    if (itemsErr || !items?.length) return json({ error: "No order items" }, 400);

    // Barakaz catalogue/order totals are CAD. Stripe accepts CAD directly.
    const totalCad = items.reduce((sum, item) =>
      sum + Number(item.price) * Number(item.quantity) + Number(item.shipping_amount || 0), 0);
    const amount = Math.round(totalCad * 100);
    if (amount <= 0) return json({ error: "Invalid order total" }, 400);

    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) return json({ error: "Stripe is not configured" }, 503);

    const shipping = order.shipping_address as Record<string, unknown> | null;
    const email: string | undefined = (shipping?.email && String(shipping.email).trim()) || user.email;
    if (!email) return json({ error: "Customer email is required" }, 400);

    // Never trust a caller-controlled Origin for payment redirects.
    // Preview environments must be explicitly allowlisted server-side.
    const allowedOrigins = new Set(["https://barakaz.com", "https://www.barakaz.com"]);
    const configuredOrigins = (Deno.env.get("STRIPE_ALLOWED_RETURN_ORIGINS") || "")
      .split(",").map((value) => value.trim()).filter(Boolean);
    for (const configured of configuredOrigins) {
      try {
        const parsed = new URL(configured);
        if (parsed.protocol === "https:" && parsed.origin === configured.replace(/\/$/, "")) {
          allowedOrigins.add(parsed.origin);
        }
      } catch { /* Ignore malformed configuration */ }
    }
    const requestedOrigin = req.headers.get("origin") || "";
    const origin = allowedOrigins.has(requestedOrigin) ? requestedOrigin : "https://barakaz.com";
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/order-confirmation/${order.id}?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${origin}/checkout?payment_cancelled=stripe`);
    params.set("customer_email", email);
    params.set("client_reference_id", order.id);
    params.set("metadata[order_id]", order.id);
    params.set("metadata[user_id]", user.id);
    params.set("payment_intent_data[metadata][order_id]", order.id);
    params.set("line_items[0][price_data][currency]", "cad");
    params.set("line_items[0][price_data][product_data][name]", `Barakaz order ${order.id.slice(0, 8).toUpperCase()}`);
    params.set("line_items[0][price_data][unit_amount]", String(amount));
    params.set("line_items[0][quantity]", "1");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `barakaz-checkout-${order.id}-${Math.floor(Date.now() / 600000)}`,
      },
      body: params.toString(),
    });
    const session = await stripeRes.json();
    if (!stripeRes.ok || !session?.id || !session?.url) {
      console.error("Stripe checkout creation failed", session);
      return json({ error: "Could not start Stripe checkout" }, 502);
    }

    await admin.from("orders").update({
      payment_provider: "stripe",
      stripe_checkout_session_id: session.id,
      charged_currency: "CAD",
      charged_amount: totalCad,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);

    return json({ url: session.url, session_id: session.id, currency: "CAD", amount: totalCad });
  } catch (error) {
    console.error("stripe-initialize", error);
    return json({ error: "Internal server error" }, 500);
  }
});
