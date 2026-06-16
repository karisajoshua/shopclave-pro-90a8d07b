import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import SEO from "@/components/seo/SEO";
import ProductCard from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlistProducts } from "@/hooks/useWishlist";
import barakazIcon from "@/assets/barakaz-icon.webp";

const WishlistPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: items, isLoading } = useWishlistProducts();

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  if (!user) return null;

  return (
    <MarketplaceLayout>
      <SEO
        title="My Wishlist | Barakaz"
        description="Products you've saved for later on Barakaz."
        canonicalPath="/wishlist"
      />
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-6 w-6 text-[hsl(var(--marketplace-orange))] fill-[hsl(var(--marketplace-orange))]" />
          <h1 className="font-display text-2xl font-bold">My Wishlist</h1>
          {items && items.length > 0 && (
            <span className="text-sm text-muted-foreground">({items.length})</span>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="font-semibold text-lg mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Save products you love by tapping the heart icon.
            </p>
            <Link to="/">
              <Button>Continue shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {items.map((row: any) => {
              const p = row.products;
              if (!p) return null;
              const images = (p.product_images || []).slice().sort(
                (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
              );
              return (
                <ProductCard
                  key={row.id}
                  id={p.id}
                  name={p.name}
                  price={Number(p.price)}
                  compareAtPrice={p.compare_at_price ? Number(p.compare_at_price) : null}
                  image={images[0]?.url || barakazIcon}
                  vendorId={p.vendor_id}
                  vendorName={p.vendors?.store_name || ""}
                  slug={p.slug}
                  dealEndsAt={p.deal_ends_at || null}
                />
              );
            })}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default WishlistPage;
