// Refreshes the site_analytics_cache row with the latest Lovable Analytics data.
// Triggered both by an admin button and by a pg_cron job every 5 minutes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROJECT_ID = "0dcababf-37ff-4237-bd5e-9900c8f1432b";

// Helper: format YYYY-MM-DD
const fmt = (d: Date) => d.toISOString().slice(0, 10);

// Pull a single metric time series from Lovable Analytics
async function fetchMetric(
  metric: string,
  startDate: string,
  endDate: string,
  granularity: "daily" | "hourly" = "daily",
) {
  const url = `https://lovable.dev/api/projects/${PROJECT_ID}/analytics?metric=${metric}&startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { total: 0, label: metric, data: [] as { date: string; value: number }[] };
  }
  return await res.json();
}

async function fetchList(
  property: string,
  startDate: string,
  endDate: string,
) {
  const url = `https://lovable.dev/api/projects/${PROJECT_ID}/analytics/breakdown?property=${property}&startDate=${startDate}&endDate=${endDate}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { label: property, data: [] as { label: string; value: number }[] };
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // 30-day window covers all UI ranges
    const startDate = fmt(start);
    const endDate = fmt(end);

    const [
      visitors,
      pageviews,
      pageviewsPerVisit,
      sessionDuration,
      bounceRate,
      page,
      source,
      device,
      country,
    ] = await Promise.all([
      fetchMetric("visitors", startDate, endDate),
      fetchMetric("pageviews", startDate, endDate),
      fetchMetric("pageviewsPerVisit", startDate, endDate),
      fetchMetric("sessionDuration", startDate, endDate),
      fetchMetric("bounceRate", startDate, endDate),
      fetchList("page", startDate, endDate),
      fetchList("source", startDate, endDate),
      fetchList("device", startDate, endDate),
      fetchList("country", startDate, endDate),
    ]);

    const payload = {
      timeSeries: {
        visitors,
        pageviews,
        pageviewsPerVisit,
        sessionDuration,
        bounceRate,
      },
      lists: { page, source, device, country },
      refreshedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("site_analytics_cache")
      .upsert({ id: 1, data: payload, updated_at: new Date().toISOString() });

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, refreshedAt: payload.refreshedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("refresh-site-analytics error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
