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

const OrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1).max(50),
  shipping_address: z.object({
    fullName: z.string().min(1).max(255),
    phone: z.string().min(1).max(50),
    addressLine: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    country: z.string().min(1).max(100),
  }),
  payment_method: z.enum(["mpesa", "card", "cod", "vendor_payment"]),
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
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
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

    const { items, shipping_address, payment_method } = parsed.data;

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

    // Insert order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        total,
        shipping_address,
        payment_method,
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

    // Insert order items
    const itemsToInsert = orderItems.map((oi) => ({ ...oi, order_id: order.id }));
    const { error: itemsError } = await adminClient.from("order_items").insert(itemsToInsert);

    if (itemsError) {
      return new Response(JSON.stringify({ error: "Failed to create order items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ order_id: order.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
