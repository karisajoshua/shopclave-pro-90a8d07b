import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const BodySchema = z.object({
  country: z.string().length(2).optional(), // ISO-2; Stripe will prompt if omitted
  return_path: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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

    const body = req.headers.get("content-type")?.includes("application/json")
      ? await req.json().catch(() => ({}))
      : {};
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Look up the vendor row for this user
    const { data: vendor, error: vendorErr } = await admin
      .from("vendors")
      .select("id, store_name")
      .eq("user_id", user.id)
      .single();

    if (vendorErr || !vendor) {
      return new Response(JSON.stringify({ error: "Vendor profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Existing Stripe account?
    const { data: existing } = await admin
      .from("vendor_stripe_accounts")
      .select("stripe_account_id")
      .eq("vendor_id", vendor.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        ...(parsed.data.country ? { country: parsed.data.country } : {}),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: vendor.store_name ?? undefined,
        },
        metadata: { vendor_id: vendor.id, user_id: user.id },
      });
      accountId = account.id;

      const { error: insertErr } = await admin.from("vendor_stripe_accounts").insert({
        vendor_id: vendor.id,
        stripe_account_id: accountId,
        country: account.country ?? null,
        default_currency: account.default_currency ?? null,
      });
      if (insertErr) {
        console.error("Failed to save vendor_stripe_accounts row:", insertErr);
      }
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://barakaz.com";
    const returnPath = parsed.data.return_path || "/vendor/payments";

    const link = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: `${origin}${returnPath}?refresh=1`,
      return_url: `${origin}${returnPath}?completed=1`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url, account_id: accountId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-connect-onboard error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
