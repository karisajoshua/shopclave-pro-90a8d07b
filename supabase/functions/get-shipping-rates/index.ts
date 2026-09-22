// Server-authoritative shipping quotation.
// Rates are fetched from Shippo, normalized to CAD, and persisted as
// short-lived `shipping_quotes` rows. The frontend only ever receives an
// opaque quote_id — prices can never be supplied or altered by the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { getCadRates } from "../_shared/paystack.ts";
import {
  addressFingerprint,
  buildParcel,
  itemsFingerprint,
  NO_DEFAULT_PACKAGE_POLICY,
  normalizeToCad,
  QUOTE_TTL_MINUTES,
  round2,
  toISO,
  validateWarehouse,
  type DefaultPackagePolicy,
} from "../_shared/shipping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHIPPO_API = "https://api.goshippo.com";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const Schema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
        variant_id: z.string().uuid().nullable().optional(),
      }),
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

interface ShippingPolicy {
  default_package: DefaultPackagePolicy;
  fallback_mode: "estimate" | "unavailable";
  estimate_base_cad: number;
  estimate_per_kg_cad: number;
  estimate_international_multiplier: number;
}

const DEFAULT_POLICY: ShippingPolicy = {
  default_package: NO_DEFAULT_PACKAGE_POLICY,
  fallback_mode: "estimate",
  estimate_base_cad: 9.5,
  estimate_per_kg_cad: 4.5,
  estimate_international_multiplier: 2.6,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SHIPPO_API_TOKEN = Deno.env.get("SHIPPO_API_TOKEN");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const parsed = Schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { items, shipping_address } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- admin-configured policy -------------------------------------
    const { data: settingRow } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "shipping_policy")
      .maybeSingle();
    const policy: ShippingPolicy = {
      ...DEFAULT_POLICY,
      ...((settingRow?.value as Partial<ShippingPolicy>) ?? {}),
      default_package: {
        ...NO_DEFAULT_PACKAGE_POLICY,
        ...(((settingRow?.value as any)?.default_package as Partial<DefaultPackagePolicy>) ?? {}),
      },
    };

    // --- products ----------------------------------------------------
    const productIds = items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select(
        "id, vendor_id, name, weight_g, length_cm, width_cm, height_cm, is_physical, international_shipping_enabled, ships_from_country, handling_time_days",
      )
      .in("id", productIds);
    if (prodErr || !products) return json({ error: "Failed to load products" }, 500);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const byVendor = new Map<string, typeof items>();
    for (const it of items) {
      const p = productMap.get(it.product_id);
      if (!p || p.is_physical === false) continue; // digital goods need no shipping
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

    const destISO = toISO(shipping_address.country);
    const addrFp = addressFingerprint(shipping_address);
    const itemsFp = itemsFingerprint(items);
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000).toISOString();
    const rates = await getCadRates();

    const address_to = {
      name: shipping_address.fullName,
      street1: shipping_address.addressLine,
      city: shipping_address.city,
      state: shipping_address.state || "",
      zip: shipping_address.zip || "",
      country: destISO,
      phone: shipping_address.phone,
      email: shipping_address.email || "",
    };

    const vendorResults: Array<Record<string, unknown>> = [];
    const quoteRows: Array<Record<string, unknown>> = [];

    for (const [vendorId, vItems] of byVendor.entries()) {
      const v = vendorMap.get(vendorId);
      const storeName = v?.store_name ?? "Vendor";
      const wh = (v?.warehouse_address as Record<string, unknown> | null) ?? {};

      const pushBlocked = (reason: string, message: string) =>
        vendorResults.push({ vendor_id: vendorId, store_name: storeName, blocked: reason, message, rates: [] });

      // 4. Vendor origin must be complete — no hard-coded fallback warehouse.
      const originCheck = validateWarehouse(wh as never);
      if (!originCheck.valid) {
        pushBlocked(
          "vendor_origin_incomplete",
          `${storeName} has not finished setting up shipping (missing ${originCheck.missing.join(", ")}). Contact the vendor or choose another seller.`,
        );
        continue;
      }
      const originISO = toISO(String(wh.country ?? ""));

      // International eligibility
      if (originISO !== destISO) {
        const ineligible = vItems.filter(
          (it) => productMap.get(it.product_id)?.international_shipping_enabled === false,
        );
        if (ineligible.length > 0) {
          pushBlocked(
            "international_not_supported",
            `${storeName} does not ship these items internationally.`,
          );
          continue;
        }
      }

      // 5. Never invent dimensions unless an explicit admin default policy exists.
      const parcelResult = buildParcel(
        vItems.map((it) => ({ product: productMap.get(it.product_id)!, quantity: it.quantity })),
        policy.default_package,
      );
      if (!parcelResult.ok) {
        pushBlocked(
          "missing_package_dimensions",
          `Package size and weight are missing for: ${[...new Set(parcelResult.missingFor)].join(", ")}. Live shipping cannot be quoted.`,
        );
        continue;
      }
      const parcel = parcelResult.parcel;

      const handlingDays = Math.max(
        ...vItems.map((it) => Number(productMap.get(it.product_id)?.handling_time_days ?? 2)),
      );

      let liveRates: Array<Record<string, unknown>> = [];
      let shippoShipmentId: string | null = null;

      if (SHIPPO_API_TOKEN) {
        try {
          const r = await fetch(`${SHIPPO_API}/shipments/`, {
            method: "POST",
            headers: {
              Authorization: `ShippoToken ${SHIPPO_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              address_from: {
                name: storeName,
                street1: wh.street1,
                city: wh.city,
                state: wh.state || "",
                zip: wh.zip || "",
                country: originISO,
                phone: wh.phone,
              },
              address_to,
              parcels: [
                {
                  length: String(parcel.length_cm),
                  width: String(parcel.width_cm),
                  height: String(parcel.height_cm),
                  distance_unit: "cm",
                  weight: String(parcel.weight_g),
                  mass_unit: "g",
                },
              ],
              async: false,
            }),
          });
          const data = await r.json();
          if (!r.ok) {
            console.error(`Shippo error for vendor ${vendorId}: ${r.status} ${JSON.stringify(data)}`);
          } else {
            shippoShipmentId = data?.object_id ?? null;
            liveRates = (data.rates || []) as Array<Record<string, unknown>>;
          }
        } catch (err) {
          console.error(`Shippo fetch failed for vendor ${vendorId}:`, err);
        }
      } else {
        console.error("SHIPPO_API_TOKEN is not configured — live rates unavailable");
      }

      const options: Array<Record<string, unknown>> = [];

      if (liveRates.length > 0) {
        const sorted = liveRates
          .map((rt) => ({
            rate_id: String(rt.object_id),
            provider: String(rt.provider ?? "Carrier"),
            service:
              String((rt.servicelevel as any)?.name ?? (rt.servicelevel as any)?.token ?? "Standard"),
            amount: Number(rt.amount),
            currency: String(rt.currency ?? "USD"),
            estimated_days: rt.estimated_days ? Number(rt.estimated_days) : null,
            duration_terms: (rt.duration_terms as string) ?? null,
          }))
          .filter((rt) => Number.isFinite(rt.amount))
          .sort((a, b) => a.amount - b.amount)
          .slice(0, 4);

        for (const rt of sorted) {
          const norm = normalizeToCad(rt.amount, rt.currency, rates ?? {});
          if (!norm) {
            console.error(`Unconvertible carrier currency ${rt.currency} for vendor ${vendorId}`);
            continue; // never mix currencies
          }
          options.push({
            source: "shippo",
            rate_id: rt.rate_id,
            provider: rt.provider,
            service: rt.service,
            amount_original: rt.amount,
            currency_original: rt.currency,
            fx_rate_to_cad: norm.fx_rate_to_cad,
            amount_cad: norm.amount_cad,
            estimated_days: rt.estimated_days,
            duration_terms: rt.duration_terms,
            is_estimate: false,
          });
        }
      }

      // 3. No live rate → clearly-labelled Barakaz estimate, or nothing at all.
      if (options.length === 0) {
        if (policy.fallback_mode !== "estimate") {
          pushBlocked(
            "live_rates_unavailable",
            "Live shipping rates are temporarily unavailable for this seller. Please try again shortly.",
          );
          continue;
        }
        const kg = Math.max(parcel.weight_g / 1000, 0.1);
        const base =
          (policy.estimate_base_cad + kg * policy.estimate_per_kg_cad) *
          (originISO === destISO ? 1 : policy.estimate_international_multiplier);
        const amountCad = round2(Math.max(5, Math.ceil(base * 2) / 2));
        options.push({
          source: "estimate",
          rate_id: null,
          provider: "Barakaz",
          service: "Barakaz Estimated Shipping",
          amount_original: amountCad,
          currency_original: "CAD",
          fx_rate_to_cad: 1,
          amount_cad: amountCad,
          estimated_days: handlingDays + (originISO === destISO ? 4 : 12),
          duration_terms: "Estimated — carrier assigned after the order is paid",
          is_estimate: true,
        });
      }

      for (const o of options) {
        quoteRows.push({
          user_id: user.id,
          vendor_id: vendorId,
          rate_id: o.rate_id,
          source: o.source,
          provider: o.provider,
          service: o.service,
          amount_original: o.amount_original,
          currency_original: o.currency_original,
          fx_rate_to_cad: o.fx_rate_to_cad,
          amount_cad: o.amount_cad,
          estimated_days: o.estimated_days,
          duration_terms: o.duration_terms,
          is_estimate: o.is_estimate,
          address_fingerprint: addrFp,
          items_fingerprint: itemsFp,
          parcel: { ...parcel, shippo_shipment_id: shippoShipmentId },
          expires_at: expiresAt,
        });
      }

      vendorResults.push({ vendor_id: vendorId, store_name: storeName, _optionCount: options.length });
    }

    // Persist all quotes in one round-trip, then hand back only quote ids.
    let inserted: Array<Record<string, unknown>> = [];
    if (quoteRows.length > 0) {
      const { data, error } = await admin.from("shipping_quotes").insert(quoteRows).select(
        "id, vendor_id, provider, service, amount_cad, currency_original, amount_original, estimated_days, duration_terms, is_estimate, expires_at",
      );
      if (error) {
        console.error("Failed to persist shipping quotes:", error);
        return json({ error: "Could not prepare shipping options" }, 500);
      }
      inserted = data ?? [];
    }

    const response = vendorResults.map((v) => {
      if (v.blocked) return v;
      return {
        vendor_id: v.vendor_id,
        store_name: v.store_name,
        rates: inserted
          .filter((q) => q.vendor_id === v.vendor_id)
          .map((q) => ({
            quote_id: q.id,
            provider: q.provider,
            service: q.service,
            amount_cad: Number(q.amount_cad),
            carrier_amount: Number(q.amount_original),
            carrier_currency: q.currency_original,
            estimated_days: q.estimated_days,
            duration_terms: q.duration_terms,
            is_estimate: q.is_estimate,
            expires_at: q.expires_at,
          })),
      };
    });

    return json({ vendors: response, currency: "CAD", expires_at: expiresAt });
  } catch (err) {
    console.error("get-shipping-rates error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
