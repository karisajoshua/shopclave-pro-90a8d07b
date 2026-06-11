import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "./ProductCard";
import { useProductRatings } from "@/hooks/useProductRatings";
import { Tag } from "lucide-react";
import barakazIcon from "@/assets/barakaz-icon.webp";

const BestDealsSection = () => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["best-deals-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(store_name), product_images(url)")
        .eq("status", "active")
        .not("compare_at_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(40);
      const withDiscount = (data || [])
        .map((p: any) => {
          const cap = Number(p.compare_at_price);
          const price = Number(p.price);
          const discount = cap > price ? (cap - price) / cap : 0;
          return { ...p, _discount: discount };
        })
        .filter((p: any) => p._discount > 0)
        .sort((a: any, b: any) => b._discount - a._discount)
        .slice(0, 10);
      return withDiscount;
    },
  });

  const { data: ratingsMap = {} } = useProductRatings(products.map((p: any) => p.id));

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <Tag className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Best Deals</h2>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {products.map((p: any) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              price={Number(p.price)}
              compareAtPrice={p.compare_at_price ? Number(p.compare_at_price) : null}
              image={p.product_images?.[0]?.url || barakazIcon}
              vendorId={p.vendor_id}
              vendorName={p.vendors?.store_name || "Unknown Seller"}
              slug={p.slug}
              rating={ratingsMap[p.id]?.avg ?? 0}
              reviewCount={ratingsMap[p.id]?.count ?? 0}
              dealEndsAt={p.deal_ends_at}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default BestDealsSection;
