// Natively background-geolocation webhook.
// Natively only supports a plain URL with no custom headers, so the
// shared secret is passed as a `?token=...` query parameter.
//
// Configure in Natively dashboard → Background Location → Webhook URL:
//   https://<project>.supabase.co/functions/v1/natively-geolocation?token=<NATIVELY_WEBHOOK_SECRET>
//
// Body shape from Natively (background location):
//   { responseId: string, latitude: number, longitude: number, ... }
// We also tolerate a few common alternate field names.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pickNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SECRET = Deno.env.get("NATIVELY_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
    console.error("Missing env: NATIVELY_WEBHOOK_SECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "Server misconfigured" }, 500);
  }

  // Validate shared secret via ?token=... (Natively can't send headers)
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token || token !== SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const responseId = pickStr(
    (payload as any).responseId,
    (payload as any).response_id,
    (payload as any).id,
    (payload as any).userId,
  );
  const latitude = pickNum((payload as any).latitude, (payload as any).lat);
  const longitude = pickNum((payload as any).longitude, (payload as any).lng, (payload as any).lon);
  const accuracy = pickNum((payload as any).accuracy, (payload as any).acc);
  const tsRaw = pickStr((payload as any).timestamp, (payload as any).time, (payload as any).recordedAt)
    ?? (typeof (payload as any).timestamp === "number" ? String((payload as any).timestamp) : null);

  if (!responseId || !UUID_RE.test(responseId)) {
    return json({ error: "responseId must be a Supabase user UUID" }, 400);
  }
  if (latitude === null || latitude < -90 || latitude > 90) {
    return json({ error: "Invalid latitude" }, 400);
  }
  if (longitude === null || longitude < -180 || longitude > 180) {
    return json({ error: "Invalid longitude" }, 400);
  }

  let recorded_at: string | null = null;
  if (tsRaw) {
    const asNum = Number(tsRaw);
    const d = !Number.isNaN(asNum) ? new Date(asNum < 1e12 ? asNum * 1000 : asNum) : new Date(tsRaw);
    if (!isNaN(d.getTime())) recorded_at = d.toISOString();
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("user_locations").upsert(
    {
      user_id: responseId,
      latitude,
      longitude,
      accuracy,
      recorded_at,
      updated_at: new Date().toISOString(),
      raw: payload,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Upsert failed:", error.message);
    return json({ error: "Database error" }, 500);
  }

  console.log(`Location updated for user ${responseId}`);
  return json({ ok: true });
});
