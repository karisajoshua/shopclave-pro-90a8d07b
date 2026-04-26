// Ocoya API proxy for the admin Social Media module.
// Keeps OCOYA_API_KEY server-side and re-checks admin role + permission.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OCOYA_BASE = "https://app.ocoya.com/api/_public/v1";

// Whitelist of allowed Ocoya endpoints. Use regex so we can match dynamic ids.
const ALLOWED_PATHS: { method: string; pattern: RegExp }[] = [
  { method: "GET", pattern: /^\/me$/ },
  { method: "GET", pattern: /^\/workspaces$/ },
  { method: "GET", pattern: /^\/social-profiles$/ },
  { method: "GET", pattern: /^\/post$/ },
  { method: "POST", pattern: /^\/post$/ },
  { method: "PATCH", pattern: /^\/post\/[A-Za-z0-9_-]+$/ },
  { method: "DELETE", pattern: /^\/post\/[A-Za-z0-9_-]+$/ },
  { method: "GET", pattern: /^\/automation$/ },
  { method: "GET", pattern: /^\/automation\/[A-Za-z0-9_-]+$/ },
  { method: "POST", pattern: /^\/automation\/[A-Za-z0-9_-]+\/start$/ },
  { method: "POST", pattern: /^\/automation\/[A-Za-z0-9_-]+\/pause$/ },
];

function isAllowed(method: string, path: string): boolean {
  return ALLOWED_PATHS.some((p) => p.method === method && p.pattern.test(path));
}

function buildQueryString(query?: Record<string, string | number | undefined>): string {
  if (!query) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const OCOYA_API_KEY = Deno.env.get("OCOYA_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!OCOYA_API_KEY) {
    return new Response(JSON.stringify({ error: "OCOYA_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the caller's identity using their JWT.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  // Re-check role + permission at the edge using a service-role client (bypasses RLS for the RPC).
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const [{ data: isAdmin, error: roleErr }, { data: hasPerm, error: permErr }] = await Promise.all([
    adminClient.rpc("has_role", { _user_id: userId, _role: "admin" }),
    adminClient.rpc("has_permission", { _user_id: userId, _perm: "social_media.manage" }),
  ]);

  if (roleErr || permErr) {
    return new Response(JSON.stringify({ error: "Permission check failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isAdmin || !hasPerm) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse the proxy request payload from the client.
  let payload: { method?: string; path?: string; query?: Record<string, string | number>; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const method = (payload.method || "GET").toUpperCase();
  const path = payload.path || "";
  if (!path.startsWith("/") || path.includes("..")) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isAllowed(method, path)) {
    return new Response(JSON.stringify({ error: `Endpoint not allowed: ${method} ${path}` }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `${OCOYA_BASE}${path}${buildQueryString(payload.query)}`;
  const init: RequestInit = {
    method,
    headers: {
      "X-API-Key": OCOYA_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (method !== "GET" && payload.body !== undefined) {
    init.body = JSON.stringify(payload.body);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return new Response(JSON.stringify({ error: `Ocoya request failed: ${msg}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = await upstream.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  // Audit log for mutating calls
  if (["POST", "PATCH", "DELETE"].includes(method) && upstream.ok) {
    try {
      let action = "ocoya_call";
      let ocoyaPostId: string | null = null;
      if (path === "/post" && method === "POST") {
        action = "created";
        if (data && typeof data === "object" && "id" in (data as Record<string, unknown>)) {
          const id = (data as Record<string, unknown>).id;
          if (typeof id === "string") ocoyaPostId = id;
        }
      } else if (/^\/post\/[A-Za-z0-9_-]+$/.test(path)) {
        action = method === "PATCH" ? "updated" : "deleted";
        ocoyaPostId = path.split("/").pop() ?? null;
      }
      await adminClient.from("social_media_post_log").insert({
        user_id: userId,
        ocoya_post_id: ocoyaPostId,
        action,
        payload: {
          method,
          path,
          query: payload.query ?? null,
          body: payload.body ?? null,
        },
      });
    } catch (e) {
      console.error("Failed to write social_media_post_log:", e);
    }
  }

  return new Response(
    JSON.stringify({ status: upstream.status, ok: upstream.ok, data }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
