const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bridgeUrl = Deno.env.get("BARAKAZ_BRIDGE_URL");
  const bridgeSecret = Deno.env.get("BARAKAZ_BRIDGE_SECRET");
  if (!bridgeUrl || !bridgeSecret) return json({ error: "Bridge is not configured" }, 503);

  const body = await req.json().catch(() => ({}));
  const allowed = new Set(["products", "product_variants", "product_images", "categories"]);
  const table = typeof body.table === "string" ? body.table : "products";
  if (!allowed.has(table)) return json({ error: "Table is not available" }, 403);

  const filters = Array.isArray(body.filters) ? body.filters : [];
  const upstream = await fetch(bridgeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-bridge-secret": bridgeSecret },
    body: JSON.stringify({ action: "select", table, filters }),
  });
  if (!upstream.ok) return json({ error: "Catalogue bridge request failed" }, 502);
  return json({ ok: true, source: "barakaz", data: await upstream.json() });
});
