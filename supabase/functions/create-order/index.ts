import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

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

    const { items, shipping_address, payment_method, shipping_selections } = parsed.data;
    const shippingByVendor = new Map(
      (shipping_selections || []).map((s) => [s.vendor_id, s])
    );

    // Use service role client for trusted operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch product prices server-side
    const productIds = items.map((i) => i.product_id);
    const { data: products, error: prodError } = await adminClient
      .from("products")
      .select("id, price, vendor_id, stock, status, name")
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

    // Compute shipping total from selections
    const shippingTotal = (shipping_selections || []).reduce((s, x) => s + Number(x.amount || 0), 0);

    // Insert order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        total: total + shippingTotal,
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

    // Insert order items (attach shipping selection per vendor — applied to first item per vendor)
    const usedVendor = new Set<string>();
    const itemsToInsert = orderItems.map((oi) => {
      const sel = shippingByVendor.get(oi.vendor_id);
      const base: any = { ...oi, order_id: order.id };
      if (sel && !usedVendor.has(oi.vendor_id)) {
        base.shipping_rate_id = sel.rate_id;
        base.shipping_amount = sel.amount;
        base.carrier = sel.carrier ?? null;
        usedVendor.add(oi.vendor_id);
      }
      return base;
    });
    const { error: itemsError } = await adminClient.from("order_items").insert(itemsToInsert);

    if (itemsError) {
      return new Response(JSON.stringify({ error: "Failed to create order items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      const deliveryFee = shippingTotal > 0 ? shippingTotal : 200;
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
