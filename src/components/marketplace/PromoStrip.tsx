import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Promo {
  id: string;
  kind: "brand" | "product";
  placement: "featured_brands" | "sponsored_products";
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string;
}

const PromoStrip = () => {
  const { data } = useQuery({
    queryKey: ["public-promotions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotions")
        .select("*")
        .order("display_order");
      return (data || []) as Promo[];
    },
  });

  if (!data?.length) return null;

  const brands = data.filter((p) => p.placement === "featured_brands");
  const products = data.filter((p) => p.placement === "sponsored_products");

  return (
    <div className="container py-6 space-y-8">
      {brands.length > 0 && (
        <section>
          <h2 className="font-display text-lg md:text-xl font-bold text-foreground mb-4">Featured Brands</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {brands.map((b) => (
              <Link key={b.id} to={b.link_url} className="group bg-card rounded-lg p-3 border hover:shadow-md transition-shadow flex flex-col items-center text-center">
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted mb-2">
                  <img src={b.image_url} alt={b.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                </div>
                <p className="text-xs font-medium text-foreground line-clamp-1">{b.title}</p>
                {b.subtitle && <p className="text-[10px] text-muted-foreground line-clamp-1">{b.subtitle}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h2 className="font-display text-lg md:text-xl font-bold text-foreground mb-4">Sponsored Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {products.slice(0, 10).map((p) => (
              <Link key={p.id} to={p.link_url} className="group bg-card rounded-lg overflow-hidden border hover:shadow-md transition-shadow">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{p.title}</p>
                  {p.subtitle && <p className="text-xs text-primary font-semibold mt-0.5 line-clamp-1">{p.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default PromoStrip;
