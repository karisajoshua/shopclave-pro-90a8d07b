import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SITE_URL = "https://barakaz.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/search", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/help", changefreq: "monthly", priority: "0.5" },
  { path: "/faq", changefreq: "monthly", priority: "0.5" },
  { path: "/delivery", changefreq: "monthly", priority: "0.5" },
  { path: "/return-policy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.3" },
  { path: "/cookie-policy", changefreq: "monthly", priority: "0.3" },
  { path: "/vendor/register", changefreq: "monthly", priority: "0.7" },
  { path: "/auth", changefreq: "monthly", priority: "0.5" },
];

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: vendors }, { data: products }] = await Promise.all([
      supabase
        .from("vendors")
        .select("slug, updated_at")
        .eq("status", "approved")
        .not("slug", "is", null)
        .limit(50000),
      supabase
        .from("products")
        .select("slug, updated_at")
        .eq("status", "active")
        .not("slug", "is", null)
        .limit(50000),
    ]);

    const urls: string[] = [];

    for (const r of STATIC_ROUTES) {
      urls.push(
        `<url><loc>${SITE_URL}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`
      );
    }

    for (const v of vendors ?? []) {
      const lastmod = v.updated_at ? new Date(v.updated_at).toISOString() : undefined;
      urls.push(
        `<url><loc>${SITE_URL}/store/${xmlEscape(v.slug!)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
        }<changefreq>weekly</changefreq><priority>0.8</priority></url>`
      );
    }

    for (const p of products ?? []) {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : undefined;
      urls.push(
        `<url><loc>${SITE_URL}/product/${xmlEscape(p.slug!)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
        }<changefreq>weekly</changefreq><priority>0.7</priority></url>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.join("\n") +
      `\n</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("sitemap error", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
