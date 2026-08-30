import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, json, paystackFetch, fromSubunit } from "../_shared/paystack.ts";

const BodySchema = z.object({
  order_id: z.string().uuid().optional(),
  reference: z.string().min(4).max(200).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    if (!parsed.data.order_id && !parsed.data.reference) {
      return json({ error: "order_id or reference required" }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let q = admin.from("orders").select("id, user_id, payment_status, paystack_reference");
    q = parsed.data.order_id
      ? q.eq("id", parsed.data.order_id)
      : q.eq("paystack_reference", parsed.data.reference!);
    const { data: order } = await q.maybeSingle();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const reference = parsed.data.reference || order.paystack_reference;
    if (!reference) return json({ paid: order.payment_status === "paid", status: order.payment_status });

    const result = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = result?.data ?? {};
    const paid = data?.status === "success";

    if (paid && order.payment_status !== "paid") {
      await admin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "processing",
          paystack_reference: reference,
          charged_currency: data?.currency ?? null,
          charged_amount:
            data?.amount != null && data?.currency ? fromSubunit(data.amount, data.currency) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    } else if (!paid && data?.status === "failed" && order.payment_status !== "paid") {
      await admin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    }

    return json({
      paid,
      status: data?.status ?? order.payment_status,
      currency: data?.currency ?? null,
      amount: data?.amount != null && data?.currency ? fromSubunit(data.amount, data.currency) : null,
      reference,
    });
  } catch (err) {
    console.error("paystack-verify error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
