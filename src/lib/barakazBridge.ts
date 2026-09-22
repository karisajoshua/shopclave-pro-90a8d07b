import { supabase } from "@/integrations/supabase/client";

type BridgeFilter = { column: string; op: "eq"|"neq"|"gt"|"gte"|"lt"|"lte"|"in"; value: unknown };

export async function readBarakaz<T = any>(table: "products"|"product_variants"|"product_images"|"categories", filters: BridgeFilter[] = []): Promise<T[]> {
  const { data, error } = await supabase.functions.invoke("barakaz-catalog", { body: { table, filters } });
  if (error) throw error;
  const payload = data?.data;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
}
