import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductRating {
  avg: number;
  count: number;
}

/**
 * Fetches average rating + review count for a list of product IDs.
 * Returns a map keyed by product id. Same data used on ProductDetailPage.
 */
export const useProductRatings = (productIds: string[]) => {
  // Filter out non-uuid demo ids so we don't blow up the RPC
  const validIds = productIds.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  return useQuery({
    queryKey: ["product-ratings", validIds.slice().sort().join(",")],
    queryFn: async (): Promise<Record<string, ProductRating>> => {
      if (!validIds.length) return {};
      const { data, error } = await supabase.rpc("get_product_ratings", {
        product_ids: validIds,
      });
      if (error) throw error;
      const map: Record<string, ProductRating> = {};
      (data || []).forEach((row: any) => {
        map[row.product_id] = {
          avg: Number(row.avg_rating) || 0,
          count: Number(row.review_count) || 0,
        };
      });
      return map;
    },
    enabled: validIds.length > 0,
    staleTime: 60_000,
  });
};
