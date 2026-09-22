import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import {
  addressFingerprint,
  itemsFingerprint,
  validateQuotes,
  round2,
} from "../_shared/shipping.ts";

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
  payment_method: z.enum(["mpesa", "card", "cod", "vendor_payment"]),
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


    // Use service role client for trusted operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch product prices server-side
    const productIds = items.map((i) => i.product_id);
    const { data: products, error: prodError } = await adminClient
      .from("products")
      .select("id, price, vendor_id, stock, status, name, is_physical")
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
    let variantMap = new Map<string, { price: number | null; stock: number }>();
    if (variantIds.length > 0) {
      const { data: variants } = await adminClient
        .from("product_variants")
        .select("id, price, stock")
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
        if (!variant) {
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

    // Insert order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        total: round2(total + shippingTotal),
        shipping_total: shippingTotal,
        shipping_address,
        payment_method,
        currency: "CAD",
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert order items. Shipping cost is recorded once per vendor (on the
    // first line) so payment totals stay correct; the shipment lifecycle lives
    // in public.shipments.
    const quoteByVendor = new Map(quotes.map((q) => [q.vendor_id, q]));
    const usedVendor = new Set<string>();
    const itemsToInsert = orderItems.map((oi) => {
      const q = quoteByVendor.get(oi.vendor_id);
      const base: any = { ...oi, order_id: order.id };
      if (q && !usedVendor.has(oi.vendor_id)) {
        base.shipping_rate_id = q.rate_id;
        base.shipping_amount = Number(q.amount_cad);
        base.carrier = q.provider ?? null;
        usedVendor.add(oi.vendor_id);
      }
      return base;
    });
    const { data: insertedItems, error: itemsError } = await adminClient
      .from("order_items")
      .insert(itemsToInsert)
      .select("id, vendor_id, quantity");

    if (itemsError || !insertedItems) {
      return new Response(JSON.stringify({ error: "Failed to create order items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // One fulfilment/shipment per vendor, with its own items.
    if (quotes.length > 0) {
      const { data: shipments, error: shipErr } = await adminClient
        .from("shipments")
        .insert(
          quotes.map((q) => ({
            order_id: order.id,
            vendor_id: q.vendor_id,
            quote_id: q.id,
            status: "preparing",
            carrier: q.provider,
            service: q.service,
            rate_id: q.rate_id,
            is_estimate: q.is_estimate,
            shippo_shipment_id: (q.parcel as any)?.shippo_shipment_id ?? null,
            shipping_amount_original: q.amount_original,
            shipping_currency_original: q.currency_original,
            fx_rate_to_cad: q.fx_rate_to_cad,
            shipping_amount_cad: q.amount_cad,
          })),
        )
        .select("id, vendor_id");

      if (shipErr) {
        console.error(`[order ${order.id}] shipment creation failed:`, shipErr);
      } else if (shipments) {
        const shipmentItems = insertedItems
          .map((oi) => {
            const s = shipments.find((sh) => sh.vendor_id === oi.vendor_id);
            return s ? { shipment_id: s.id, order_item_id: oi.id, quantity: oi.quantity } : null;
          })
          .filter(Boolean) as Array<Record<string, unknown>>;
        if (shipmentItems.length > 0) {
          const { error: siErr } = await adminClient.from("shipment_items").insert(shipmentItems);
          if (siErr) console.error(`[order ${order.id}] shipment_items failed:`, siErr);
        }
        for (const s of shipments) {
          await adminClient.from("tracking_events").insert({
            shipment_id: s.id,
            status: "preparing",
            description: "Order received — vendor is preparing your parcel.",
            provider_event_key: `created-${s.id}`,
          });
        }
      }

      // Burn the quotes so they cannot be replayed on another order.
      await adminClient
        .from("shipping_quotes")
        .update({ consumed_order_id: order.id })
        .in("id", quotes.map((q) => q.id));
    }

    // Send order confirmation email (best-effort — never fail the order)
    try {
      // Build short id, formatted date, items with product names
      const orderShortId = order.id.slice(0, 8).toUpperCase();
      const orderDate = new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const emailItems = orderItems.map((oi) => {
        const product = productMap.get(oi.product_id);
        const variantLabel =
          oi.variant_options && typeof oi.variant_options === "object"
            ? (oi.variant_options as Record<string, string>).label ?? null
            : null;
        return {
          name: product?.name ?? "Product",
          variantLabel,
          quantity: oi.quantity,
          unitPrice: oi.price,
          lineTotal: oi.price * oi.quantity,
        };
      });

      const subtotal = total;
      const deliveryFee = shippingTotal;
      const grandTotal = subtotal + deliveryFee;

      const paymentLabelMap: Record<string, string> = {
        mpesa: "M-Pesa",
        card: "Card",
        cod: "Pay on Delivery",
        vendor_payment: "Pay Vendor Directly",
      };

      // Resolve recipient email with priority: form > JWT > auth.admin lookup
      let recipientEmail: string | null =
        (shipping_address.email && shipping_address.email.trim()) || user.email || null;

      if (!recipientEmail) {
        try {
          const { data: adminUserData } = await adminClient.auth.admin.getUserById(user.id);
          recipientEmail = adminUserData?.user?.email ?? null;
        } catch (lookupErr) {
          console.error("auth.admin.getUserById failed:", lookupErr);
        }
      }

      if (!recipientEmail) {
        console.warn(
          `[order ${order.id}] No recipient email found (user ${user.id}). Skipping confirmation email.`
        );
      } else {
        const emailPayload = {
          templateName: "order-confirmation",
          recipientEmail,
          idempotencyKey: `order-confirm-${order.id}`,
          templateData: {
            customerName: shipping_address.fullName,
            orderShortId,
            orderDate,
            items: emailItems,
            subtotal,
            deliveryFee,
            total: grandTotal,
            shippingAddress: shipping_address,
            paymentMethodLabel: paymentLabelMap[payment_method] ?? payment_method,
            trackUrl: "https://barakaz.com/account",
          },
        };

        const { data: invokeData, error: invokeError } = await adminClient.functions.invoke(
          "send-transactional-email",
          { body: emailPayload }
        );

        if (invokeError) {
          console.error(
            `[order ${order.id}] send-transactional-email invoke failed: recipient=${recipientEmail} error=${JSON.stringify(invokeError)}`
          );
        } else {
          console.log(
            `[order ${order.id}] order-confirmation enqueued for ${recipientEmail} response=${JSON.stringify(invokeData)}`
          );
        }
      }
    } catch (emailErr) {
      console.error("order confirmation email failed:", emailErr);
    }

    // Vendor notification emails (best-effort — never fail the order)
    try {
      const orderShortId = order.id.slice(0, 8).toUpperCase();
      const orderDate = new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const paymentLabelMap: Record<string, string> = {
        mpesa: "M-Pesa",
        card: "Card",
        cod: "Pay on Delivery",
        vendor_payment: "Pay Vendor Directly",
      };

      // Fetch vendor owners
      const { data: vendorRows } = await adminClient
        .from("vendors")
        .select("id, store_name, user_id")
        .in("id", vendorIds);
      const vendorOwnerMap = new Map((vendorRows || []).map((v) => [v.id, v]));

      // Group items by vendor
      const itemsByVendor = new Map<string, typeof orderItems>();
      for (const oi of orderItems) {
        const arr = itemsByVendor.get(oi.vendor_id) ?? [];
        arr.push(oi);
        itemsByVendor.set(oi.vendor_id, arr);
      }

      for (const [vendorId, vItems] of itemsByVendor.entries()) {
        const vendor = vendorOwnerMap.get(vendorId);
        if (!vendor?.user_id) {
          console.warn(`[order ${order.id}] vendor ${vendorId} has no user_id; skipping vendor email`);
          continue;
        }

        let vendorEmail: string | null = null;
        let vendorFullName: string | null = null;
        try {
          const { data: vUserData } = await adminClient.auth.admin.getUserById(vendor.user_id);
          vendorEmail = vUserData?.user?.email ?? null;
          vendorFullName =
            (vUserData?.user?.user_metadata as any)?.full_name ?? null;
        } catch (lookupErr) {
          console.error(`[order ${order.id}] vendor user lookup failed:`, lookupErr);
        }

        if (!vendorEmail) {
          console.warn(
            `[order ${order.id}] No email for vendor ${vendorId} (user ${vendor.user_id}). Skipping.`
          );
          continue;
        }

        const vendorEmailItems = vItems.map((oi) => {
          const product = productMap.get(oi.product_id);
          const variantLabel =
            oi.variant_options && typeof oi.variant_options === "object"
              ? (oi.variant_options as Record<string, string>).label ?? null
              : null;
          return {
            name: product?.name ?? "Product",
            variantLabel,
            quantity: oi.quantity,
            unitPrice: oi.price,
            lineTotal: oi.price * oi.quantity,
          };
        });
        const vendorSubtotal = vendorEmailItems.reduce((s, i) => s + i.lineTotal, 0);

        const payload = {
          templateName: "vendor-new-order",
          recipientEmail: vendorEmail,
          idempotencyKey: `vendor-new-order-${order.id}-${vendorId}`,
          templateData: {
            vendorName: vendorFullName,
            storeName: vendor.store_name,
            orderShortId,
            orderDate,
            items: vendorEmailItems,
            vendorSubtotal,
            buyerName: shipping_address.fullName,
            shippingAddress: shipping_address,
            paymentMethodLabel: paymentLabelMap[payment_method] ?? payment_method,
            manageUrl: "https://barakaz.com/vendor/orders",
          },
        };

        try {
          const { error: invokeError } = await adminClient.functions.invoke(
            "send-transactional-email",
            { body: payload }
          );
          if (invokeError) {
            console.error(
              `[order ${order.id}] vendor-new-order invoke failed for ${vendorEmail}: ${JSON.stringify(invokeError)}`
            );
          } else {
            console.log(`[order ${order.id}] vendor-new-order enqueued for ${vendorEmail}`);
          }
        } catch (sendErr) {
          console.error(`[order ${order.id}] vendor-new-order send error:`, sendErr);
        }
      }
    } catch (vendorEmailErr) {
      console.error("vendor notification emails failed:", vendorEmailErr);
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
