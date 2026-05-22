import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHIPPO_API = "https://api.goshippo.com";

const Schema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
        variant_id: z.string().uuid().nullable().optional(),
      })
    )
    .min(1)
    .max(50),
  shipping_address: z.object({
    fullName: z.string().min(1).max(255),
    phone: z.string().min(1).max(50),
    addressLine: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    state: z.string().max(100).optional().or(z.literal("")),
    zip: z.string().max(20).optional().or(z.literal("")),
    country: z.string().min(2).max(100),
    email: z.string().email().max(255).optional().or(z.literal("")),
  }),
});

// ISO country code map for common names
const COUNTRY_TO_ISO: Record<string, string> = {
  kenya: "KE", "united states": "US", usa: "US", "united kingdom": "GB", uk: "GB",
  uganda: "UG", tanzania: "TZ", rwanda: "RW", nigeria: "NG", "south africa": "ZA",
  ghana: "GH", ethiopia: "ET", egypt: "EG", india: "IN", china: "CN", germany: "DE",
  france: "FR", canada: "CA", australia: "AU",
};
const toISO = (c: string) => {
  if (!c) return "US";
  if (c.length === 2) return c.toUpperCase();
  return COUNTRY_TO_ISO[c.trim().toLowerCase()] ?? c.slice(0, 2).toUpperCase();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SHIPPO_API_TOKEN = Deno.env.get("SHIPPO_API_TOKEN");
    if (!SHIPPO_API_TOKEN) {
      return new Response(JSON.stringify({ error: "SHIPPO_API_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { items, shipping_address } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const productIds = items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id, vendor_id, weight_g, length_cm, width_cm, height_cm, name")
      .in("id", productIds);
    if (prodErr || !products) {
      return new Response(JSON.stringify({ error: "Failed to load products" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Group items by vendor
    const byVendor = new Map<string, typeof items>();
    for (const it of items) {
      const p = productMap.get(it.product_id);
      if (!p) continue;
      const arr = byVendor.get(p.vendor_id) || [];
      arr.push(it);
      byVendor.set(p.vendor_id, arr);
    }

    const vendorIds = [...byVendor.keys()];
    const { data: vendors } = await admin
      .from("vendors")
      .select("id, store_name, warehouse_address")
      .in("id", vendorIds);
    const vendorMap = new Map((vendors || []).map((v) => [v.id, v]));

    const address_to = {
      name: shipping_address.fullName,
      street1: shipping_address.addressLine,
      city: shipping_address.city,
      state: shipping_address.state || "",
      zip: shipping_address.zip || "00000",
      country: toISO(shipping_address.country),
      phone: shipping_address.phone,
      email: shipping_address.email || "",
    };

    const vendorResults: Array<any> = [];

    const FALLBACK_ORIGIN = {
      street1: "Moi Avenue",
      city: "Nairobi",
      state: "",
      zip: "00100",
      country: "KE",
      phone: "+254700000000",
    };

    for (const [vendorId, vItems] of byVendor.entries()) {
      const v = vendorMap.get(vendorId);
      const wh = (v?.warehouse_address as any) || {};
      const missingOrigin = !wh.street1 || !wh.city || !wh.country;
      const usedFallbackOrigin = missingOrigin;

      // Combined parcel
      let weight = 0;
      let L = 0, W = 0, H = 0;
      for (const it of vItems) {
        const p = productMap.get(it.product_id)!;
        weight += (p.weight_g ?? 500) * it.quantity;
        L = Math.max(L, Number(p.length_cm ?? 20));
        W = Math.max(W, Number(p.width_cm ?? 15));
        H = Math.max(H, Number(p.height_cm ?? 10));
      }
      weight = Math.max(weight, 1);

      // Destination-aware multi-option estimate (Economy / Standard / Express).
      const KE_HUBS = new Set([
        "nairobi","mombasa","kisumu","nakuru","eldoret","thika","nyeri","machakos","kakamega","meru",
      ]);
      const normCity = (s: string) =>
        (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "").trim();

      const originCountry = usedFallbackOrigin ? FALLBACK_ORIGIN.country : toISO(wh.country || "KE");
      const destCountry = toISO(shipping_address.country);
      const originCity = normCity(usedFallbackOrigin ? FALLBACK_ORIGIN.city : (wh.city || ""));
      const destCity = normCity(shipping_address.city);

      let zone: "same_city" | "intercity_ke" | "remote_ke" | "international";
      if (originCountry !== "KE" || destCountry !== "KE") zone = "international";
      else if (originCity && destCity && originCity === destCity) zone = "same_city";
      else if (KE_HUBS.has(destCity)) zone = "intercity_ke";
      else zone = "remote_ke";

      const ZONE_PRICING: Record<string, { base: number; perKg: number }> = {
        same_city:     { base: 250,  perKg: 120 },
        intercity_ke:  { base: 550,  perKg: 180 },
        remote_ke:     { base: 750,  perKg: 220 },
        international: { base: 1800, perKg: 600 },
      };
      const SERVICES = [
        { key: "Economy",  mult: 0.85, days: 6, terms: "5-7 business days",
          carrierKE: "G4S Courier",          carrierIntl: "Aramex Economy" },
        { key: "Standard", mult: 1.0,  days: 4, terms: "3-5 business days",
          carrierKE: "Wells Fargo Courier",  carrierIntl: "DHL eCommerce" },
        { key: "Express",  mult: 1.6,  days: 2, terms: "1-2 business days",
          carrierKE: "Sendy Express",        carrierIntl: "DHL Express" },
      ];

      const synthesizeEstimate = () => {
        const kg = Math.max(weight / 1000, 0.1);
        const { base, perKg } = ZONE_PRICING[zone];
        return SERVICES.map((s) => {
          const raw = (base + kg * perKg) * s.mult;
          const amount = Math.max(200, Math.ceil(raw / 50) * 50);
          return {
            rate_id: `est-${vendorId}-${s.key.toLowerCase()}`,
            provider: zone === "international" ? s.carrierIntl : s.carrierKE,
            service: `${s.key} delivery`,
            amount,
            currency: "KES",
            estimated_days: s.days,
            duration_terms: s.terms,
            is_estimate: true,
          };
        });
      };

      const origin = usedFallbackOrigin ? FALLBACK_ORIGIN : {
        street1: wh.street1,
        city: wh.city,
        state: wh.state || "",
        zip: wh.zip || "00000",
        country: toISO(wh.country),
        phone: wh.phone || FALLBACK_ORIGIN.phone,
      };

      const shippoBody = {
        address_from: { name: v?.store_name ?? "Vendor", ...origin },
        address_to,
        parcels: [{
          length: String(L), width: String(W), height: String(H),
          distance_unit: "cm", weight: String(weight), mass_unit: "g",
        }],
        async: false,
      };

      try {
        const r = await fetch(`${SHIPPO_API}/shipments/`, {
          method: "POST",
          headers: {
            Authorization: `ShippoToken ${SHIPPO_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shippoBody),
        });
        const data = await r.json();

        if (!r.ok) {
          console.error(`Shippo error for vendor ${vendorId}:`, data);
          vendorResults.push({
            vendor_id: vendorId,
            store_name: v?.store_name ?? "Vendor",
            usedFallbackOrigin,
            rates: synthesizeEstimate(),
          });
          continue;
        }

        let rates = (data.rates || [])
          .map((rt: any) => ({
            rate_id: rt.object_id,
            provider: rt.provider,
            service: rt.servicelevel?.name || rt.servicelevel?.token || "Standard",
            amount: Number(rt.amount),
            currency: rt.currency,
            estimated_days: rt.estimated_days,
            duration_terms: rt.duration_terms,
          }))
          .sort((a: any, b: any) => a.amount - b.amount)
          .slice(0, 4);

        if (rates.length === 0) rates = synthesizeEstimate();

        vendorResults.push({
          vendor_id: vendorId,
          store_name: v?.store_name ?? "Vendor",
          usedFallbackOrigin,
          rates,
        });
      } catch (err) {
        console.error(`Shippo fetch failed for vendor ${vendorId}:`, err);
        vendorResults.push({
          vendor_id: vendorId,
          store_name: v?.store_name ?? "Vendor",
          usedFallbackOrigin,
          rates: synthesizeEstimate(),
        });
      }
    }

    return new Response(JSON.stringify({ vendors: vendorResults }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-shipping-rates error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
