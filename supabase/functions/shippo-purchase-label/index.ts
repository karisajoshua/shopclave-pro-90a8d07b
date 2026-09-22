// Purchases Shippo labels for an order that is verifiably paid.
// Never invoked from a browser success redirect: it re-reads payment state
// from the database and claims each shipment row before calling Shippo, so a
// label can only ever be bought once.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { toISO, validateWarehouse } from "../_shared/shipping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SHIPPO_API = "https://api.goshippo.com";
const Body = z.object({ order_id: z.string().uuid(), shipment_id: z.string().uuid().optional() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  // Caller must be the platform itself (service role) or an admin.
  let authorized = token === serviceKey;
  if (!authorized) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      authorized = Boolean(isAdmin);
    }
  }
  if (!authorized) return json({ error: "Forbidden" }, 403);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Invalid input" }, 400);
  const { order_id, shipment_id } = parsed.data;

  const SHIPPO_API_TOKEN = Deno.env.get("SHIPPO_API_TOKEN");
  if (!SHIPPO_API_TOKEN) return json({ error: "Shipping provider not configured" }, 503);

  // 7. Payment must be verified server-side before any label is bought.
  const { data: order } = await admin
    .from("orders")
    .select("id, payment_status, shipping_address")
    .eq("id", order_id)
    .maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);
  if (order.payment_status !== "paid") return json({ error: "Order is not paid" }, 409);

  let q = admin
    .from("shipments")
    .select("*")
    .eq("order_id", order_id)
    .is("shippo_transaction_id", null);
  if (shipment_id) q = q.eq("id", shipment_id);
  const { data: shipments } = await q;
  if (!shipments || shipments.length === 0) return json({ purchased: 0, message: "Nothing to purchase" });

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const results: Array<Record<string, unknown>> = [];

  for (const s of shipments) {
    // Idempotency claim: only one caller can flip label_purchased_at from null.
    const { data: claimed } = await admin
      .from("shipments")
      .update({ label_purchased_at: new Date().toISOString() })
      .eq("id", s.id)
      .is("label_purchased_at", null)
      .is("shippo_transaction_id", null)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      results.push({ shipment_id: s.id, skipped: "already_claimed" });
      continue;
    }

    const fail = async (reason: string) => {
      await admin
        .from("shipments")
        .update({ label_error: reason, label_purchased_at: null })
        .eq("id", s.id);
      results.push({ shipment_id: s.id, error: reason });
    };

    if (s.is_estimate || !s.rate_id) {
      await admin.from("shipments").update({
        fulfilment_mode: "manual",
        status: "manual_booking_required",
        label_error: null,
        label_purchased_at: null,
      }).eq("id", s.id);
      await admin.from("tracking_events").upsert({
        shipment_id: s.id,
        status: "manual_booking_required",
        description: "No live carrier label is available. The vendor must arrange this parcel with a carrier manually.",
        provider_event_key: `manual-required-${s.id}`,
      }, { onConflict: "shipment_id,provider_event_key", ignoreDuplicates: true });
      results.push({ shipment_id: s.id, skipped: "manual_booking_required" });
      continue;
    }

    const { data: vendor } = await admin
      .from("vendors")
      .select("warehouse_address, store_name")
      .eq("id", s.vendor_id)
      .maybeSingle();
    const check = validateWarehouse((vendor?.warehouse_address ?? {}) as never);
    if (!check.valid) {
      await fail(`Vendor fulfilment address incomplete: ${check.missing.join(", ")}`);
      continue;
    }

    try {
      const res = await fetch(`${SHIPPO_API}/transactions/`, {
        method: "POST",
        headers: {
          Authorization: `ShippoToken ${SHIPPO_API_TOKEN}`,
          "Content-Type": "application/json",
          // Shippo honours an idempotency key on transaction creation.
          "Shippo-Idempotency-Key": `barakaz-shipment-${s.id}`,
        },
        body: JSON.stringify({
          rate: s.rate_id,
          label_file_type: "PDF_4x6",
          async: false,
          metadata: `barakaz_order=${order_id};shipment=${s.id}`,
        }),
      });
      const data = await res.json();

      if (!res.ok || data?.status === "ERROR") {
        const detail =
          data?.messages?.map((m: any) => m.text).join("; ") || `Shippo ${res.status}`;
        console.error(`Label purchase failed for shipment ${s.id}: ${detail}`);
        await fail(detail);
        continue;
      }

      const trackingUrl =
        data.tracking_url_provider ||
        (data.tracking_number
          ? `https://track.goshippo.com/${data.tracking_number}`
          : null);

      await admin
        .from("shipments")
        .update({
          shippo_transaction_id: data.object_id,
          label_url: data.label_url ?? null,
          commercial_invoice_url: data.commercial_invoice_url ?? null,
          tracking_number: data.tracking_number ?? null,
          tracking_url: trackingUrl,
          status: "ready_for_pickup",
          label_error: null,
          estimated_delivery: data.eta ?? null,
        })
        .eq("id", s.id);

      await admin.from("tracking_events").insert({
        shipment_id: s.id,
        status: "ready_for_pickup",
        provider_status: data.status ?? "SUCCESS",
        description: "Shipping label created — awaiting carrier collection.",
        provider_event_key: `label-${data.object_id}`,
        raw: { transaction: data.object_id, carrier: s.carrier },
      });

      // Register the tracking number for carrier webhooks.
      if (data.tracking_number && data.carrier_account) {
        try {
          await fetch(`${SHIPPO_API}/tracks/`, {
            method: "POST",
            headers: {
              Authorization: `ShippoToken ${SHIPPO_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              carrier: data.tracking_url_provider ? undefined : undefined,
              tracking_number: data.tracking_number,
              metadata: `shipment=${s.id}`,
            }),
          });
        } catch (e) {
          console.error("Track registration failed:", e);
        }
      }

      results.push({ shipment_id: s.id, transaction: data.object_id, tracking: data.tracking_number });
    } catch (err) {
      console.error(`Label purchase error for shipment ${s.id}:`, err);
      await fail("Carrier request failed. Please retry.");
    }
  }

  return json({ purchased: results.filter((r) => r.transaction).length, results });
});
