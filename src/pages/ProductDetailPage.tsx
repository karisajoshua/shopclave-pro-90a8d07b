import { useParams } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, ShoppingCart, Minus, Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/TranslationContext";
import barakazIcon from "@/assets/barakaz-icon.png";

const ProductDetailPage = () => {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(id, store_name), product_images(url, position)")
        .eq("slug", slug!)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  const { data: variants } = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product!.id);
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Extract option types and values from variants
  const optionTypes = useMemo(() => {
    if (!variants?.length) return {};
    const types: Record<string, Set<string>> = {};
    variants.forEach((v: any) => {
      const opts = v.variant_options as Record<string, string>;
      Object.entries(opts).forEach(([key, val]) => {
        if (!types[key]) types[key] = new Set();
        types[key].add(val);
      });
    });
    return Object.fromEntries(Object.entries(types).map(([k, v]) => [k, Array.from(v)]));
  }, [variants]);

  const hasVariants = Object.keys(optionTypes).length > 0;

  // Auto-select first options
  useMemo(() => {
    if (hasVariants && Object.keys(selectedOptions).length === 0) {
      const defaults: Record<string, string> = {};
      Object.entries(optionTypes).forEach(([key, values]) => {
        defaults[key] = values[0];
      });
      setSelectedOptions(defaults);
    }
  }, [optionTypes, hasVariants]);

  // Find matching variant
  const selectedVariant = useMemo(() => {
    if (!hasVariants || !variants?.length) return null;
    return variants.find((v: any) => {
      const opts = v.variant_options as Record<string, string>;
      return Object.entries(selectedOptions).every(([key, val]) => opts[key] === val);
    }) || null;
  }, [variants, selectedOptions, hasVariants]);

  const displayPrice = selectedVariant?.price ?? product?.price;
  const displayStock = hasVariants ? (selectedVariant?.stock ?? 0) : product?.stock;

  if (isLoading) {
    return (
      <MarketplaceLayout>
        <div className="container py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!product) {
    return (
      <MarketplaceLayout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold">{t("product.notFound")}</h1>
        </div>
      </MarketplaceLayout>
    );
  }

  const images = product.product_images?.length
    ? product.product_images.sort((a: any, b: any) => a.position - b.position).map((i: any) => i.url)
    : [barakazIcon];

  const handleAddToCart = () => {
    const variantLabel = hasVariants
      ? Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(", ")
      : undefined;

    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: Number(displayPrice),
        image: images[0],
        vendorId: product.vendor_id,
        vendorName: (product.vendors as any)?.store_name || "Unknown Seller",
        variantId: selectedVariant?.id || undefined,
        variantLabel,
      });
    }
    toast.success(`${product.name} added to cart`);
  };

  return (
    <MarketplaceLayout>
      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-lg overflow-hidden bg-secondary border border-border">
              <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {images.slice(0, 4).map((img: string, i: number) => (
                  <div key={i} className="w-16 h-16 rounded-md overflow-hidden border border-border bg-secondary">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Store className="h-4 w-4" />
              <span>{(product.vendors as any)?.store_name || "Unknown Seller"}</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">{product.name}</h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < 4 ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">(0 {t("product.reviews")})</span>
            </div>

            <div className="mb-6">
              <p className="text-3xl font-bold text-foreground">KSh {Number(displayPrice).toLocaleString()}</p>
              {product.compare_at_price && (
                <p className="text-sm text-muted-foreground line-through mt-1">KSh {Number(product.compare_at_price).toLocaleString()}</p>
              )}
            </div>

            {/* Variant Selectors */}
            {hasVariants && (
              <div className="space-y-4 mb-6">
                {Object.entries(optionTypes).map(([optName, values]) => (
                  <div key={optName}>
                    <Label className="text-sm font-medium mb-2 block">{optName}</Label>
                    <div className="flex flex-wrap gap-2">
                      {values.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [optName]: val }))}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            selectedOptions[optName] === val
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border text-muted-foreground hover:border-foreground/30"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center border border-border rounded-lg">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button className="flex-1 font-semibold gap-2" size="lg" onClick={handleAddToCart} disabled={hasVariants && !selectedVariant}>
                <ShoppingCart className="h-5 w-5" />
                {t("product.addToCart")}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className={`font-medium ${(displayStock ?? 0) > 0 ? "text-success" : "text-destructive"}`}>
                {(displayStock ?? 0) > 0 ? `${t("product.inStock")} (${displayStock} ${t("product.available")})` : t("product.outOfStock")}
              </p>
            </div>

            {product.description && (
              <div className="mt-6 border-t border-border pt-6">
                <h3 className="font-semibold mb-2">{t("product.description")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-sm font-medium ${className}`}>{children}</span>
);

export default ProductDetailPage;
