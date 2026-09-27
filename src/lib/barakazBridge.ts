import { supabase } from "@/integrations/supabase/client";

type BridgeFilter = { column: string; op: "eq"|"neq"|"gt"|"gte"|"lt"|"lte"|"in"; value: unknown };

let bridgeUnavailable = false;

export async function readBarakaz<T = any>(table: "products"|"product_variants"|"product_images"|"categories", filters: BridgeFilter[] = []): Promise<T[]> {
  if (bridgeUnavailable) return [];
  const { data, error } = await supabase.functions.invoke("barakaz-catalog", { body: { table, filters } });
  if (error) throw error;
  if (data?.configured === false) { bridgeUnavailable = true; return []; }
  const payload = data?.data;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
}
