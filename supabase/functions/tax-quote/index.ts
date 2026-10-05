// Server-authoritative Canadian sales-tax preview for the checkout review step.
// Read-only: computes tax from server-held prices and server-issued shipping
// quotes. Never trusts client prices. Fails closed with a clear reason.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { calculateTax, type TaxCategory } from "../_shared/tax.ts";
import { loadTaxConfig, taxErrorMessage } from "../_shared/taxConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: corsHeaders });

const Body = z.object({
  province: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
    variant_id: z.string().uuid().nullable().optional(),
  })).min(1).max(50),
  shipping_quote_ids: z.array(z.string().uuid()).max(50).optional().default([]),
});

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
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const { province, country, items, shipping_quote_ids } = parsed.data;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: products } = await admin.from("products")
      .select("id, price, tax_category").in("id", items.map((i) => i.product_id));
    const productMap = new Map((products || []).map((p) => [p.id, p]));

    const variantIds = items.filter((i) => i.variant_id).map((i) => i.variant_id!);
    const variantMap = new Map<string, { price: number | null; product_id: string }>();
    if (variantIds.length) {
      const { data: variants } = await admin.from("product_variants").select("id, product_id, price").in("id", variantIds);
      for (const v of variants || []) variantMap.set(v.id, v);
    }

    const lines = items.map((i) => {
      const p = productMap.get(i.product_id);
      if (!p) return null;
      const variant = i.variant_id ? variantMap.get(i.variant_id) : null;
      if (i.variant_id && (!variant || variant.product_id !== i.product_id)) return null;
      const unit = variant?.price != null ? Number(variant.price) : Number(p.price);
      return {
        id: `${i.product_id}:${i.variant_id ?? ""}`,
        amountCents: Math.round(unit * i.quantity * 100),
        category: (p.tax_category ?? "unknown") as TaxCategory,
      };
    });
    if (lines.some((l) => l === null)) return json({ ok: false, error: "Product not found" }, 400);

    let shippingCents = 0;
    if (shipping_quote_ids.length) {
      const { data: quotes } = await admin.from("shipping_quotes")
        .select("id, user_id, amount_cad").in("id", shipping_quote_ids);
      for (const q of quotes || []) {
        if (q.user_id !== user.id) return json({ ok: false, error: "Invalid shipping selection" }, 400);
        shippingCents += Math.round(Number(q.amount_cad) * 100);
      }
    }

    const cfg = await loadTaxConfig(admin, Deno.env.get("ALLOW_UNAPPROVED_TAX_TEST_MODE") === "true" && /^(sk|rk)_test_/.test(Deno.env.get("STRIPE_SECRET_KEY") || ""));
    const result = calculateTax({
      province, country,
      date: new Date().toISOString().slice(0, 10),
      lines: lines as any,
      shippingCents,
    }, cfg);

    if (!result.ok) return json({ ok: false, reason: result.reason, message: taxErrorMessage(result.reason) }, 200);

    return json({
      ok: true,
      province: result.province,
      total_tax_cad: result.totalTaxCents / 100,
      components: result.components.map((c) => ({
        component: c.component,
        rate_percent: c.ratePpm / 10000,
        tax_cad: c.taxCents / 100,
      })),
    });
  } catch (err) {
    console.error("tax-quote", err);
    return json({ error: "Internal server error" }, 500);
  }
});
