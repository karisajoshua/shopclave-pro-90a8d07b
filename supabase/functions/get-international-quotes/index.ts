// DEVELOPMENT ONLY: authenticated international DAP quote endpoint.
// Requires reviewed/applied international_quotes migration and explicit deployment.
// This endpoint NEVER enables payment, DDP, or international label purchasing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { getCadRates } from "../_shared/paystack.ts";
import {
  addressFingerprint, buildParcel, itemsFingerprint, NO_DEFAULT_PACKAGE_POLICY,
  QUOTE_TTL_MINUTES, toISO, validateWarehouse,
} from "../_shared/shipping.ts";
import {
  checkInternationalEligibility, prepareShippoDapQuoteRows, verifiedShippoShipmentRates, type VendorParcel,
} from "../_shared/international.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});
const schema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(), quantity: z.number().int().min(1).max(100),
    variant_id: z.string().uuid().nullable().optional(),
  })).min(1).max(50),
  shipping_address: z.object({
    fullName: z.string().min(1), addressLine: z.string().min(1),
    city: z.string().min(1), state: z.string().optional(),
    zip: z.string().optional(), country: z.string().min(2),
    phone: z.string().min(1), email: z.string().email().optional(),
  }),
});
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return reply({ error: "Unauthorized" }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: "Invalid input" }, 400);
    const { items, shipping_address: address } = parsed.data;
    // Fail closed on duplicate product/variant lines until canonical cart merging is implemented.
    const itemKeys = items.map((i) => `${i.product_id}:${i.variant_id ?? ""}`);
    if (new Set(itemKeys).size !== itemKeys.length)
      return reply({ error: "Duplicate cart lines are not supported" }, 422);
    // Variant-specific parcel/customs data must be resolved before enabling variants.
    if (items.some((i) => i.variant_id)) return reply({ error: "Variant customs data is not yet supported" }, 422);
    const destination = toISO(address.country);
    if (destination === "CA" || !/^[A-Z]{2}$/.test(destination))
      return reply({ error: "International destination required" }, 422);
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const shippoToken = Deno.env.get("SHIPPO_API_TOKEN");
    if (!url || !anon || !service || !shippoToken)
      return reply({ error: "International quote provider unavailable" }, 503);
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply({ error: "Unauthorized" }, 401);
    const admin = createClient(url, service);
    const { data: products, error: productError } = await admin.from("products")
      .select("id,vendor_id,name,is_physical,international_shipping_enabled,ships_from_country,hs_code,country_of_manufacture,customs_value_cad,weight_g,length_cm,width_cm,height_cm")
      .in("id", items.map((i) => i.product_id));
    if (productError || !products || products.length !== new Set(items.map((i) => i.product_id)).size)
      return reply({ error: "Products unavailable or customs migration missing" }, 422);
    const byId = new Map(products.map((p) => [p.id, p]));
    const byVendor = new Map<string, typeof items>();
    for (const item of items) {
      const p = byId.get(item.product_id);
      if (!p || p.is_physical === false || p.international_shipping_enabled !== true)
        return reply({ error: "All selected products must support international physical shipping" }, 422);
      const group = byVendor.get(p.vendor_id) ?? [];
      group.push(item);
      byVendor.set(p.vendor_id, group);
    }
    const { data: vendors, error: vendorError } = await admin.from("vendors")
      .select("id,store_name,warehouse_address").in("id", [...byVendor.keys()]);
    if (vendorError || !vendors || vendors.length !== byVendor.size)
      return reply({ error: "Vendor warehouses unavailable" }, 422);
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const fx = await getCadRates();
    if (!fx || typeof fx !== "object") return reply({ error: "Currency conversion unavailable" }, 503);
    const addrFp = addressFingerprint(address);
    const cartFp = itemsFingerprint(items);
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000).toISOString();
    const result: Array<Record<string, unknown>> = [];
    for (const [vendorId, group] of byVendor) {
      const vendor = vendorMap.get(vendorId)!;
      const wh = vendor.warehouse_address;
      const check = validateWarehouse(wh);
      if (!check.valid) return reply({ error: "Vendor warehouse incomplete", vendor_id: vendorId }, 422);
      const origin = toISO(wh.country);
      // First release only handles exports from Canada; other lanes need separate review.
      if (origin !== "CA") return reply({ error: "Origin not supported", vendor_id: vendorId }, 422);
      const built = buildParcel(group.map((item) => ({ product: byId.get(item.product_id)!, quantity: item.quantity })), NO_DEFAULT_PACKAGE_POLICY);
      if (!built.ok) return reply({ error: "Missing product dimensions", vendor_id: vendorId }, 422);
      const p: VendorParcel = {
        vendorId, originCountry: origin, weightG: built.parcel.weight_g,
        lengthCm: built.parcel.length_cm, widthCm: built.parcel.width_cm,
        heightCm: built.parcel.height_cm,
        lines: group.map((item) => {
          const product = byId.get(item.product_id)!;
          return {
            productId: product.id, name: product.name, hsCode: product.hs_code,
            countryOfManufacture: product.country_of_manufacture,
            declaredValueCad: product.customs_value_cad,
            quantity: item.quantity, weightG: product.weight_g,
          };
        }),
      };
      const eligibility = checkInternationalEligibility(destination, [p]);
      if (!eligibility.ok) return reply({ error: "International customs data incomplete", vendor_id: vendorId, issues: eligibility.issues }, 422);
      const parcelFp = JSON.stringify(p);
      const shipmentResponse = await fetch("https://api.goshippo.com/shipments/", {
        method: "POST",
        headers: { Authorization: `ShippoToken ${shippoToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          address_from: { name: vendor.store_name, street1: wh.street1, city: wh.city,
            state: wh.state || "", zip: wh.zip || "", country: origin, phone: wh.phone },
          address_to: { name: address.fullName, street1: address.addressLine,
            city: address.city, state: address.state || "", zip: address.zip || "",
            country: destination, phone: address.phone, email: address.email || "" },
          parcels: [{ length: String(p.lengthCm), width: String(p.widthCm),
            height: String(p.heightCm), distance_unit: "cm",
            weight: String(p.weightG), mass_unit: "g" }],
          async: false,
        }),
      });
      if (!shipmentResponse.ok) return reply({ error: "Carrier quote unavailable", vendor_id: vendorId }, 503);
      const shipment = await shipmentResponse.json();
      const verifiedRates = verifiedShippoShipmentRates(shipment);
      if (!verifiedRates) return reply({ error: "Carrier shipment response could not be verified", vendor_id: vendorId }, 503);
      const rows = prepareShippoDapQuoteRows(verifiedRates, fx as Record<string, number>, {
        userId: user.id, vendorId, originCountry: origin, destinationCountry: destination,
        addressFingerprint: addrFp, itemsFingerprint: cartFp,
        parcelFingerprint: parcelFp, parcel: p, expiresAt,
      });
      if (!rows.length) return reply({ error: "No convertible international rates", vendor_id: vendorId }, 422);
      result.push({ vendor_id: vendorId, rows });
    }
    // Persist only after every vendor has an eligible verified rate.
    const rows = result.flatMap((v) => v.rows as Record<string, unknown>[]);
    const { data: saved, error: saveError } = await admin.from("international_quotes")
      .insert(rows).select("id,vendor_id,shipping_cad,expires_at");
    if (saveError || !saved) return reply({ error: "International quote storage unavailable" }, 503);
    return reply({ currency: "CAD", mode: "DAP", duties_prepaid: false,
      warning: "Import duties, taxes and courier handling fees may be due on delivery.",
      vendors: saved.map((q) => ({ quote_id: q.id, vendor_id: q.vendor_id,
        shipping_cad: q.shipping_cad, expires_at: q.expires_at })) });
  } catch (error) {
    console.error("get-international-quotes failed", error);
    return reply({ error: "International quotes unavailable" }, 503);
  }
});
