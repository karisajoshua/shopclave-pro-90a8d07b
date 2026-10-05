import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { sendOrderEmails, ONLINE_METHODS } from "../_shared/order-emails.ts";
import {
  addressFingerprint,
  itemsFingerprint,
  validateQuotes,
  round2,
} from "../_shared/shipping.ts";
import { calculateTax, type TaxCategory } from "../_shared/tax.ts";
import { loadTaxConfig, taxErrorMessage, TAX_ENGINE_VERSION } from "../_shared/taxConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  variant_id: z.string().uuid().nullable().optional(),
  variant_label: z.string().max(255).nullable().optional(),
});

// The client may only reference server-issued quotes — never prices.

const OrderSchema = z.object({
  idempotency_key: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1).max(50),
  shipping_address: z.object({
    fullName: z.string().min(1).max(255),
    phone: z.string().min(1).max(50),
    addressLine: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    state: z.string().max(100).optional().or(z.literal("")),
    zip: z.string().max(20).optional().or(z.literal("")),
    country: z.string().min(1).max(100),
    email: z.string().email().max(255).optional().or(z.literal("")),
  }),
  payment_method: z.enum(["card"]),
  shipping_quote_ids: z.array(z.string().uuid()).max(50).optional().default([]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const body = await req.json();
    const parsed = OrderSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items, shipping_address, payment_method, shipping_quote_ids } = parsed.data;

    // International checkout remains disabled until the separate, atomic
    // international order and quote-consumption path has passed review.
    if (!["CA", "CANADA"].includes(shipping_address.country.trim().toUpperCase())) {
      return new Response(JSON.stringify({
        error: "International checkout is not yet enabled. No payment has been initiated.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // Use service role client for trusted operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const fingerprintBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({
      items: [...items].sort((a,b) => `${a.product_id}:${a.variant_id || ""}`.localeCompare(`${b.product_id}:${b.variant_id || ""}`)),
      shipping_address, payment_method, shipping_quote_ids: [...shipping_quote_ids].sort(),
    })));
    const fingerprint = [...new Uint8Array(fingerprintBytes)].map(b => b.toString(16).padStart(2,"0")).join("");
    const { data: previous, error: previousError } = await adminClient.from("orders")
      .select("id,checkout_fingerprint").eq("user_id",user.id).eq("idempotency_key",parsed.data.idempotency_key).maybeSingle();
    if (previousError) throw previousError;
    if (previous) {
      if (previous.checkout_fingerprint !== fingerprint) return new Response(JSON.stringify({error:"Checkout key reused with a different cart."}),{status:409,headers:corsHeaders});
      return new Response(JSON.stringify({order_id:previous.id}),{headers:corsHeaders});
    }
    // Fetch product prices server-side
    const productIds = items.map((i) => i.product_id);
    const { data: products, error: prodError } = await adminClient
      .from("products")
      .select("id, price, vendor_id, stock, status, name, is_physical, tax_category")
      .in("id", productIds);

    if (prodError || !products) {
      return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Fetch variant prices if needed
    const variantIds = items.filter((i) => i.variant_id).map((i) => i.variant_id!);
    let variantMap = new Map<string, { price: number | null; stock: number; product_id: string }>();
    if (variantIds.length > 0) {
      const { data: variants } = await adminClient
        .from("product_variants")
        .select("id, product_id, price, stock")
        .in("id", variantIds);
      if (variants) {
        variantMap = new Map(variants.map((v) => [v.id, v]));
      }
    }

    // Fetch vendor commission rates
    const vendorIds = [...new Set(products.map((p) => p.vendor_id))];
    const { data: vendors } = await adminClient
      .from("vendors")
      .select("id, commission_rate")
      .in("id", vendorIds);
    const vendorMap = new Map((vendors || []).map((v) => [v.id, v]));

    // Validate and calculate
    let total = 0;
    const orderItems: Array<{
      product_id: string;
      vendor_id: string;
      quantity: number;
      price: number;
      commission_amount: number;
      variant_id: string | null;
      variant_options: Record<string, string> | null;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.product_id}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (product.status !== "active") {
        return new Response(
          JSON.stringify({ error: `Product not available: ${product.name}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let unitPrice = product.price;
      let availableStock = product.stock;

      if (item.variant_id) {
        const variant = variantMap.get(item.variant_id);
        if (!variant || variant.product_id !== item.product_id) {
          return new Response(
            JSON.stringify({ error: `Variant not found: ${item.variant_id}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (variant.price !== null) unitPrice = variant.price;
        availableStock = variant.stock;
      }

      if (item.quantity > availableStock) {
        return new Response(
          JSON.stringify({ error: `Insufficient stock for ${product.name}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const vendor = vendorMap.get(product.vendor_id);
      const commissionRate = vendor?.commission_rate ?? 10;
      const lineTotal = unitPrice * item.quantity;
      const commissionAmount = (lineTotal * commissionRate) / 100;

      total += lineTotal;
      orderItems.push({
        product_id: item.product_id,
        vendor_id: product.vendor_id,
        quantity: item.quantity,
        price: unitPrice,
        commission_amount: commissionAmount,
        variant_id: item.variant_id || null,
        variant_options: item.variant_label ? { label: item.variant_label } : null,
      });
    }

    // ---- Shipping: validate server-issued quotes, never client prices ----
    const physicalVendorIds = [
      ...new Set(
        orderItems
          .filter((oi) => (productMap.get(oi.product_id) as any)?.is_physical !== false)
          .map((oi) => oi.vendor_id),
      ),
    ];

    let quotes: any[] = [];
    let shippingTotal = 0;

    if (physicalVendorIds.length > 0) {
      if (!shipping_quote_ids || shipping_quote_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "A shipping option must be selected before checkout." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: quoteRows, error: quoteErr } = await adminClient
        .from("shipping_quotes")
        .select("*")
        .in("id", shipping_quote_ids);

      if (quoteErr || !quoteRows || quoteRows.length !== shipping_quote_ids.length) {
        return new Response(JSON.stringify({ error: "Shipping quote not found. Please re-select delivery." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const check = validateQuotes(quoteRows as any, {
        userId: user.id,
        requiredVendorIds: physicalVendorIds,
        addressFingerprint: addressFingerprint(shipping_address),
        itemsFingerprint: itemsFingerprint(items),
      });

      if (!check.ok) {
        const messages: Record<string, string> = {
          not_owner: "This shipping quote does not belong to you.",
          expired: "Your shipping quote expired. Please re-select a delivery option.",
          already_used: "This shipping quote has already been used.",
          address_changed: "Your delivery address changed. Please re-select a delivery option.",
          items_changed: "Your cart changed. Please re-select a delivery option.",
          vendor_mismatch: "Invalid shipping selection.",
          missing_vendor: "A delivery option is missing for one of the sellers.",
          not_found: "Shipping quote not found.",
        };
        console.error(`create-order shipping rejected: ${check.reason} ${check.detail ?? ""}`);
        return new Response(JSON.stringify({ error: messages[check.reason] ?? "Invalid shipping selection." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      quotes = quoteRows;
      shippingTotal = check.totalCad;
    }

    // ---- Canadian sales tax: server-authoritative, fails closed ----
    const taxPoint = new Date().toISOString().slice(0, 10);
    const taxRequest = {
      province: shipping_address.state || "",
      country: shipping_address.country,
      date: taxPoint,
      lines: orderItems.map((oi, index) => ({
        id: String(index),
        amountCents: Math.round(oi.price * oi.quantity * 100),
        category: ((productMap.get(oi.product_id) as any)?.tax_category ?? "unknown") as TaxCategory,
      })),
      shippingCents: Math.round(shippingTotal * 100),
    };
    const taxConfig = await loadTaxConfig(adminClient, Deno.env.get("ALLOW_UNAPPROVED_TAX_TEST_MODE") === "true" && /^(sk|rk)_test_/.test(Deno.env.get("STRIPE_SECRET_KEY") || ""));
    const taxResult = calculateTax(taxRequest, taxConfig);
    if (!taxResult.ok) {
      console.error(`create-order tax rejected: ${taxResult.reason}`);
      return new Response(JSON.stringify({ error: taxErrorMessage(taxResult.reason) }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const taxTotal = round2(taxResult.totalTaxCents / 100);

    const { data: orderId, error: orderError } = await adminClient.rpc("create_checkout_order", {
      p_user: user.id, p_key: parsed.data.idempotency_key, p_fingerprint: fingerprint,
      p_order: { total: round2(total + shippingTotal + taxTotal), shipping_total: shippingTotal,
        tax_amount: taxTotal, tax_province: taxResult.province,
        tax_breakdown: {components: taxResult.components, shipping: taxResult.shipping},
        tax_engine_version: TAX_ENGINE_VERSION, shipping_address, payment_method },
      p_items: orderItems.map((oi,index) => ({...oi, tax_category: taxResult.lines[index]?.category,
        tax_amount: round2((taxResult.lines[index]?.taxCents || 0)/100),
        tax_breakdown: {components: taxResult.lines[index]?.components || []} })),
      p_quotes: shipping_quote_ids,
      p_snapshot: {tax_point:taxPoint, request:taxRequest, result:taxResult},
    });
    if (orderError || !orderId) {
      console.error("Atomic checkout failed",orderError?.code);
      return new Response(JSON.stringify({error:"Your stock, price or delivery selection changed. Refresh checkout and try again."}),{status:409,headers:corsHeaders});
    }
    const order = {id:orderId};

    // Emails (best-effort). Online card payments (Stripe/Paystack): NO email
    // here — the customer and sellers are only emailed by the signed webhook
    // after verified payment ("paid" stage). Offline methods (COD, pay vendor
    // directly, M-Pesa) still get the "order received / awaiting payment" note.
    if (!ONLINE_METHODS.has(payment_method)) {
      try {
        await sendOrderEmails(adminClient, order.id, "received", {
          notifyVendors: true,
        });
      } catch (emailErr) {
        console.error("order received email failed:", emailErr);
      }
    }




    return new Response(JSON.stringify({ order_id: order.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
