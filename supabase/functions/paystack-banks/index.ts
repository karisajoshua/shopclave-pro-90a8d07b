import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, json, paystackFetch } from "../_shared/paystack.ts";

const BodySchema = z.object({
  country: z.enum(["nigeria", "ghana", "south africa", "kenya", "egypt", "cote d'ivoire"]).default("nigeria"),
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

    const result = await paystackFetch(
      `/bank?country=${encodeURIComponent(parsed.data.country)}&perPage=200`,
    );

    const banks = (result?.data ?? []).map((b: any) => ({
      name: b.name,
      code: b.code,
      currency: b.currency,
      type: b.type,
    }));

    return json({ banks });
  } catch (err) {
    console.error("paystack-banks error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
