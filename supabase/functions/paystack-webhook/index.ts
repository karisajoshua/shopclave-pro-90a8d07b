import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, paystackKey, fromSubunit } from "../_shared/paystack.ts";

async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const signature = req.headers.get("x-paystack-signature");
  const body = await req.text();

  if (!signature) return json({ error: "Missing signature" }, 400);

  let expected: string;
  try {
    expected = await hmacSha512Hex(paystackKey(), body);
  } catch (e) {
    console.error("Signature computation failed:", e);
    return json({ error: "Server not configured" }, 500);
  }
  if (expected !== signature) {
    console.error("Invalid Paystack signature");
    return json({ error: "Invalid signature" }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  console.log("Paystack event:", event?.event, event?.data?.reference);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const data = event?.data ?? {};
    const reference: string | undefined = data?.reference;
    const orderId: string | undefined = data?.metadata?.order_id;

    if (event?.event === "charge.success") {
      const currency = data?.currency ?? null;
      const amount = data?.amount != null && currency ? fromSubunit(data.amount, currency) : null;

      let query = admin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "processing",
          paystack_reference: reference ?? null,
          charged_currency: currency,
          charged_amount: amount,
          updated_at: new Date().toISOString(),
        })
        .neq("payment_status", "paid"); // idempotent

      query = orderId ? query.eq("id", orderId) : query.eq("paystack_reference", reference!);
      const { error } = await query;
      if (error) console.error("Order update failed:", error);
      else console.log("Order marked paid:", orderId ?? reference);

      // Record which subaccount each vendor's share went to (Paystack settles the split itself).
      if (orderId && Array.isArray(data?.split?.subaccounts ?? data?.subaccount)) {
        // no-op: shape varies; handled below via split_code
      }
      if (orderId && data?.split?.split_code) {
        await admin
          .from("order_items")
          .update({ paystack_split_code: data.split.split_code })
          .eq("order_id", orderId);
      }
    } else if (event?.event === "charge.failed") {
      if (orderId || reference) {
        let q = admin.from("orders").update({ payment_status: "failed" });
        q = orderId ? q.eq("id", orderId) : q.eq("paystack_reference", reference!);
        await q;
      }
    } else if (typeof event?.event === "string" && event.event.startsWith("transfer.")) {
      console.log("Transfer event:", event.event, data?.reference, data?.status);
    }
  } catch (err) {
    console.error("Paystack webhook handler error:", err);
  }

  return json({ received: true });
});
