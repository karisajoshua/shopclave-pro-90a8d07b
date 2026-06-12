import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Received Stripe event:", event.type, event.id);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await admin
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            stripe_checkout_session_id: session.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        console.log("Order marked paid:", orderId);

        // Fire per-vendor transfers (separate charges & transfers pattern)
        await createVendorTransfers(admin, orderId, session);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.order_id;
      if (orderId) {
        await admin.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
      }
    } else if (event.type === "account.updated") {
      const acct = event.data.object as Stripe.Account;
      await admin
        .from("vendor_stripe_accounts")
        .update({
          charges_enabled: !!acct.charges_enabled,
          payouts_enabled: !!acct.payouts_enabled,
          details_submitted: !!acct.details_submitted,
          country: acct.country ?? null,
          default_currency: acct.default_currency ?? null,
          requirements_due: (acct.requirements?.currently_due ?? []) as unknown as Record<string, unknown>,
        })
        .eq("stripe_account_id", acct.id);
      console.log("Synced vendor Stripe account:", acct.id);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function createVendorTransfers(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  session: Stripe.Checkout.Session
) {
  try {
    // Read order items with computed vendor_payout (from compute_order_item_fees trigger)
    const { data: items, error } = await admin
      .from("order_items")
      .select("id, vendor_id, vendor_payout, stripe_transfer_id")
      .eq("order_id", orderId);

    if (error || !items || items.length === 0) {
      console.warn("createVendorTransfers: no items for order", orderId, error);
      return;
    }

    const currency = (session.currency || "usd").toLowerCase();
    const charge =
      typeof session.payment_intent === "string"
        ? (await stripe.paymentIntents.retrieve(session.payment_intent)).latest_charge
        : null;
    const sourceTransaction = typeof charge === "string" ? charge : null;

    // Group payout per vendor
    const perVendor = new Map<string, { amount: number; itemIds: string[] }>();
    for (const it of items) {
      if (it.stripe_transfer_id) continue; // already transferred
      const cur = perVendor.get(it.vendor_id) ?? { amount: 0, itemIds: [] };
      cur.amount += Number(it.vendor_payout || 0);
      cur.itemIds.push(it.id);
      perVendor.set(it.vendor_id, cur);
    }

    for (const [vendorId, { amount, itemIds }] of perVendor) {
      if (amount <= 0) continue;

      const { data: acct } = await admin
        .from("vendor_stripe_accounts")
        .select("stripe_account_id, charges_enabled, payouts_enabled")
        .eq("vendor_id", vendorId)
        .maybeSingle();

      if (!acct?.stripe_account_id) {
        console.warn(`No Stripe account for vendor ${vendorId}; skipping transfer`);
        continue;
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(amount * 100),
          currency,
          destination: acct.stripe_account_id,
          transfer_group: `order_${orderId}`,
          ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
          metadata: { order_id: orderId, vendor_id: vendorId },
        });

        // Stamp the first item per vendor with the transfer id
        await admin
          .from("order_items")
          .update({
            stripe_transfer_id: transfer.id,
            stripe_destination_account: acct.stripe_account_id,
          })
          .in("id", itemIds);

        console.log(`Transferred ${amount} ${currency} to vendor ${vendorId} (${transfer.id})`);
      } catch (transferErr) {
        console.error(`Transfer failed for vendor ${vendorId}:`, transferErr);
      }
    }
  } catch (err) {
    console.error("createVendorTransfers fatal:", err);
  }
}
