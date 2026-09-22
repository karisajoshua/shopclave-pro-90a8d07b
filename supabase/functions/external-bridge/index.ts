// External write bridge.
// Lets a trusted external backend (another Supabase project, a server, a cron job)
// read and modify Barakaz data over HTTPS without ever holding Barakaz's
// service-role key. Authentication is a single shared secret sent in the
// `x-bridge-secret` header and compared in constant time.
//
// Only the tables listed in ALLOWED_TABLES can be touched, and every call is
// written to `audit_logs` so changes are traceable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bridge-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Tables the external project is permitted to touch.
const ALLOWED_TABLES = new Set([
  "products",
  "product_variants",
  "product_images",
  "categories",
  "vendors",
  "orders",
  "order_items",
  "shipments",
  "tracking_events",
  "return_requests",
  "notifications",
  "platform_settings",
]);

const FilterSchema = z.object({
  column: z.string().min(1).max(64),
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]),
  value: z.unknown(),
});

const Body = z.object({
  action: z.enum(["select", "insert", "update", "delete", "rpc"]),
  table: z.string().min(1).max(64).optional(),
  fn: z.string().min(1).max(64).optional(),
  args: z.record(z.unknown()).optional(),
  values: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
  filters: z.array(FilterSchema).max(10).optional().default([]),
  columns: z.string().max(500).optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
});

function timingSafeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("EXTERNAL_BRIDGE_SECRET");
  if (!expected) return json({ error: "Bridge is not configured" }, 503);

  const provided = req.headers.get("x-bridge-secret") ?? "";
  if (!provided || !timingSafeEqual(provided, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
  }
  const { action, table, fn, args, values, filters, columns, limit } = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // --- stored procedure -------------------------------------------------
    if (action === "rpc") {
      if (!fn) return json({ error: "fn is required for rpc" }, 400);
      const { data, error } = await admin.rpc(fn, (args ?? {}) as never);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, data });
    }

    if (!table) return json({ error: "table is required" }, 400);
    if (!ALLOWED_TABLES.has(table)) {
      return json({ error: `Table "${table}" is not allowed through the bridge` }, 403);
    }

    const applyFilters = (q: any) => {
      for (const f of filters) {
        if (f.op === "in") {
          if (!Array.isArray(f.value)) throw new Error(`Filter on ${f.column} with "in" needs an array`);
          q = q.in(f.column, f.value);
        } else if (f.op === "is") {
          q = q.is(f.column, f.value as null | boolean);
        } else {
          q = (q as any)[f.op](f.column, f.value);
        }
      }
      return q;
    };

    let result: { data: unknown; error: { message: string } | null };

    if (action === "select") {
      result = await applyFilters(admin.from(table).select(columns ?? "*")).limit(limit);
    } else if (action === "insert") {
      if (!values) return json({ error: "values is required for insert" }, 400);
      result = await admin.from(table).insert(values as never).select();
    } else if (action === "update") {
      if (!values || Array.isArray(values)) {
        return json({ error: "values must be a single object for update" }, 400);
      }
      if (filters.length === 0) {
        return json({ error: "update requires at least one filter" }, 400);
      }
      result = await applyFilters(admin.from(table).update(values as never)).select();
    } else {
      if (filters.length === 0) {
        return json({ error: "delete requires at least one filter" }, 400);
      }
      result = await applyFilters(admin.from(table).delete()).select();
    }

    if (result.error) return json({ error: result.error.message }, 400);

    if (action !== "select") {
      await admin.from("audit_logs").insert({
        action_type: `external_bridge_${action}`,
        action_details: {
          table,
          filters,
          affected: Array.isArray(result.data) ? result.data.length : 0,
        },
      });
    }

    return json({
      ok: true,
      count: Array.isArray(result.data) ? result.data.length : 0,
      data: result.data,
    });
  } catch (err) {
    console.error("external-bridge error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
