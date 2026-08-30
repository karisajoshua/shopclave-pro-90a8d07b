import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, json, paystackFetch } from "../_shared/paystack.ts";

const COUNTRY_CURRENCY: Record<string, string> = {
  nigeria: "NGN",
  ghana: "GHS",
  "south africa": "ZAR",
  kenya: "KES",
  egypt: "EGP",
  "cote d'ivoire": "XOF",
};

const BodySchema = z.object({
  bank_code: z.string().min(2).max(20),
  account_number: z.string().min(6).max(20),
  country: z.enum(["nigeria", "ghana", "south africa", "kenya", "egypt", "cote d'ivoire"]).default("nigeria"),
  business_name: z.string().min(1).max(200).optional(),
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
    const { bank_code, account_number, country } = parsed.data;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: vendor } = await admin
      .from("vendors")
      .select("id, store_name")
      .eq("user_id", user.id)
      .single();
    if (!vendor) return json({ error: "Vendor profile not found" }, 404);

    // Validate the bank account and read back the real account holder name.
    const resolved = await paystackFetch(
      `/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
    );
    const accountName: string = resolved?.data?.account_name ?? "";

    const banks = await paystackFetch(`/bank?country=${encodeURIComponent(country)}&perPage=200`);
    const bankName =
      (banks?.data ?? []).find((b: any) => String(b.code) === String(bank_code))?.name ?? null;

    const businessName = parsed.data.business_name || vendor.store_name || accountName || "Vendor";
    const currency = COUNTRY_CURRENCY[country] ?? "NGN";

    const { data: existing } = await admin
      .from("vendor_paystack_accounts")
      .select("id, subaccount_code")
      .eq("vendor_id", vendor.id)
      .maybeSingle();

    let subaccountCode = existing?.subaccount_code ?? null;

    const payload = {
      business_name: businessName,
      settlement_bank: bank_code,
      account_number,
      percentage_charge: 0,
      primary_contact_email: user.email ?? undefined,
      metadata: { vendor_id: vendor.id, user_id: user.id },
    };

    if (subaccountCode) {
      await paystackFetch(`/subaccount/${encodeURIComponent(subaccountCode)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      const created = await paystackFetch("/subaccount", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      subaccountCode = created?.data?.subaccount_code;
      if (!subaccountCode) throw new Error("Paystack did not return a subaccount code");
    }

    const row = {
      vendor_id: vendor.id,
      subaccount_code: subaccountCode!,
      business_name: businessName,
      bank_code,
      bank_name: bankName,
      account_number_last4: account_number.slice(-4),
      account_name: accountName,
      currency,
      country,
      percentage_charge: 0,
      active: true,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await admin
      .from("vendor_paystack_accounts")
      .upsert(row, { onConflict: "vendor_id" });
    if (upsertErr) {
      console.error("Failed to save vendor_paystack_accounts row:", upsertErr);
      return json({ error: "Could not save payout details" }, 500);
    }

    return json({ connected: true, ...row });
  } catch (err) {
    console.error("paystack-subaccount error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
