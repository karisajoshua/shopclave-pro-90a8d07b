// Shippo tracking webhook.
// Authenticated with a shared secret Shippo sends back on the webhook URL
// (Shippo has no payload signature), and made idempotent through
// public.webhook_events + a unique provider_event_key per tracking event.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapShippoStatus } from "../_shared/shipping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-shippo-signature",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("SHIPPO_WEBHOOK_SECRET");
  if (!secret) {
    console.error("SHIPPO_WEBHOOK_SECRET is not configured");
    return json({ error: "Not configured" }, 500);
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get("token") || req.headers.get("x-shippo-token") || "";
  if (!timingSafeEqual(provided, secret)) {
    console.error("Shippo webhook rejected: bad token");
    return json({ error: "Unauthorized" }, 401);
  }

  const raw = await req.text();
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const data = event?.data ?? event;
  const trackingNumber: string | undefined = data?.tracking_number;
  const transactionId: string | undefined = data?.transaction;
  const statusObj = data?.tracking_status ?? {};
  const eventKey =
    statusObj?.object_id ||
    `${trackingNumber ?? transactionId ?? "unknown"}-${statusObj?.status ?? ""}-${statusObj?.status_date ?? ""}`;

  // Whole-delivery idempotency: a replayed webhook is acknowledged, not reprocessed.
  const { error: dupErr } = await admin
    .from("webhook_events")
    .insert({ provider: "shippo", event_key: eventKey, payload: event });
  if (dupErr) {
    if (dupErr.code === "23505") return json({ ok: true, duplicate: true });
    console.error("webhook_events insert failed:", dupErr);
  }

  // Resolve the shipment.
  let shipment: { id: string; order_id: string } | null = null;
  if (transactionId) {
    const { data: s } = await admin
      .from("shipments")
      .select("id, order_id")
      .eq("shippo_transaction_id", transactionId)
      .maybeSingle();
    shipment = s ?? null;
  }
  if (!shipment && trackingNumber) {
    const { data: s } = await admin
      .from("shipments")
      .select("id, order_id")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();
    shipment = s ?? null;
  }
  if (!shipment) {
    console.warn("Shippo webhook: no matching shipment", trackingNumber, transactionId);
    return json({ ok: true, matched: false });
  }

  const canonical = mapShippoStatus(statusObj?.status, statusObj?.substatus?.code);
  const occurredAt = statusObj?.status_date ?? new Date().toISOString();
  const location = [
    statusObj?.location?.city,
    statusObj?.location?.state,
    statusObj?.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  // Append history — never overwrite it.
  await admin.from("tracking_events").insert({
    shipment_id: shipment.id,
    status: canonical,
    provider_status: statusObj?.status ?? null,
    description: statusObj?.status_details ?? null,
    location: location || null,
    occurred_at: occurredAt,
    provider_event_key: eventKey,
    raw: data ?? {},
  });

  const patch: Record<string, unknown> = { status: canonical };
  if (data?.eta) patch.estimated_delivery = data.eta;
  if (canonical === "delivered") patch.delivered_at = occurredAt;
  await admin.from("shipments").update(patch).eq("id", shipment.id);

  // Reflect delivery on the order lines for this vendor's fulfilment.
  if (canonical === "delivered" || canonical === "in_transit") {
    const { data: si } = await admin
      .from("shipment_items")
      .select("order_item_id")
      .eq("shipment_id", shipment.id);
    const ids = (si ?? []).map((r) => r.order_item_id);
    if (ids.length > 0) {
      await admin
        .from("order_items")
        .update({ status: canonical === "delivered" ? "delivered" : "shipped" })
        .in("id", ids);
    }
  }

  return json({ ok: true, status: canonical });
});
