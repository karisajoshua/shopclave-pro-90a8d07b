import { useSearchParams } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import ProductCard from "@/components/marketplace/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/TranslationContext";
import barakazIcon from "@/assets/barakaz-icon.png";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const categorySlug = searchParams.get("category") || "";
  const [query, setQuery] = useState(initialQuery);
  const { t } = useTranslation();

  // Resolve category slug -> category id + descendant ids
  const { data: categoryInfo, isLoading: categoryLoading } = useQuery({
    queryKey: ["category-resolve", categorySlug],
    enabled: !!categorySlug,
    queryFn: async () => {
      const { data: cat } = await supabase
        .from("categories")
        .select("id, name")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (!cat) return { ids: [] as string[], name: "" };

      const { data: children } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", cat.id);
      const childIds = (children || []).map((c: any) => c.id);

      let grandIds: string[] = [];
      if (childIds.length) {
        const { data: grand } = await supabase
          .from("categories")
          .select("id")
          .in("parent_id", childIds);
        grandIds = (grand || []).map((g: any) => g.id);
      }

      return { ids: [cat.id, ...childIds, ...grandIds], name: cat.name };
    },
  });

  const categoryIds = categoryInfo?.ids || [];
  const categoryReady = !categorySlug || !categoryLoading;

  const { data: products, isLoading } = useQuery({
    queryKey: ["search-products", query, categorySlug, categoryIds.join(",")],
    enabled: categoryReady,
    queryFn: async () => {
      if (categorySlug && categoryIds.length === 0) return [];

      let q = supabase
        .from("products")
        .select("*, vendors(store_name), product_images(url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(48);

      if (query.trim()) {
        q = q.ilike("name", `%${query.trim()}%`);
      }

      if (categorySlug && categoryIds.length > 0) {
        q = q.in("category_id", categoryIds);
      }

      const { data } = await q;
      return data || [];
    },
  });

  const displayProducts = (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : null,
    image: p.product_images?.[0]?.url || barakazIcon,
    vendorId: p.vendor_id,
    vendorName: p.vendors?.store_name || "Unknown Seller",
    slug: p.slug,
    rating: 4.5,
    reviewCount: 0,
    dealEndsAt: p.deal_ends_at || null,
  }));

  const headingText = query
    ? `${t("search.resultsFor")} "${query}"`
    : categoryInfo?.name
      ? categoryInfo.name
      : t("search.allProducts");

  return (
    <MarketplaceLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-xl">
            <Input
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10 h-12 text-base"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <h1 className="font-display text-xl font-bold mb-6">
          {headingText}
          {displayProducts.length > 0 && (
            <span className="text-muted-foreground font-normal text-base ml-2">({displayProducts.length})</span>
          )}
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">{t("search.noProducts")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("search.tryDifferent")}</p>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default SearchPage;
