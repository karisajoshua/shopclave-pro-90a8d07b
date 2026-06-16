import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useWishlist = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data || []).map((r) => r.product_id as string));
    },
  });
};

export const useToggleWishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) {
        navigate("/auth");
        throw new Error("auth-required");
      }
      const { data: existing } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("wishlists").delete().eq("id", existing.id);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["wishlist", user?.id] });
      qc.invalidateQueries({ queryKey: ["wishlist-products", user?.id] });
      toast.success(result.added ? "Added to wishlist" : "Removed from wishlist");
    },
    onError: (err: Error) => {
      if (err.message !== "auth-required") toast.error("Could not update wishlist");
    },
  });
};

export const useWishlistProducts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wishlist-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select(
          `id, created_at, product_id,
           products(id, name, slug, price, compare_at_price, vendor_id, deal_ends_at,
             vendors(store_name),
             product_images(url, position))`
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
};
