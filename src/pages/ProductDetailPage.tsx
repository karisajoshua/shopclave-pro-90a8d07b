import { useParams, useNavigate, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, ShoppingCart, Minus, Plus, Store, MapPin, ChevronRight, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLocale } from "@/hooks/useLocale";
import ProductGallery from "@/components/product/ProductGallery";
import ProductReviews from "@/components/product/ProductReviews";
import barakazIcon from "@/assets/barakaz-icon.png";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { country, formatPrice } = useLocale();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(id, store_name), product_images(url, position), categories(name, slug)")
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

  // Fetch review stats
  const { data: reviewStats } = useQuery({
    queryKey: ["review-stats", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", product!.id);
      if (!data?.length) return { avg: 0, count: 0 };
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg, count: data.length };
    },
    enabled: !!product?.id,
  });

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

  useMemo(() => {
    if (hasVariants && Object.keys(selectedOptions).length === 0) {
      const defaults: Record<string, string> = {};
      Object.entries(optionTypes).forEach(([key, values]) => {
        defaults[key] = values[0];
      });
      setSelectedOptions(defaults);
    }
  }, [optionTypes, hasVariants]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants || !variants?.length) return null;
    return variants.find((v: any) => {
      const opts = v.variant_options as Record<string, string>;
      return Object.entries(selectedOptions).every(([key, val]) => opts[key] === val);
    }) || null;
  }, [variants, selectedOptions, hasVariants]);

  const displayPrice = selectedVariant?.price ?? product?.price;
  const displayStock = hasVariants ? (selectedVariant?.stock ?? 0) : product?.stock;

  const discountPct = product?.compare_at_price && Number(product.compare_at_price) > Number(displayPrice)
    ? Math.round(((Number(product.compare_at_price) - Number(displayPrice)) / Number(product.compare_at_price)) * 100)
    : null;

  if (isLoading) {
    return (
      <MarketplaceLayout>
        <div className="container py-6">
          <Skeleton className="h-4 w-48 mb-6" />
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

  const buildCartItem = () => {
    const variantLabel = hasVariants
      ? Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(", ")
      : undefined;
    return {
      productId: product.id,
      name: product.name,
      price: Number(displayPrice),
      image: images[0],
      vendorId: product.vendor_id,
      vendorName: (product.vendors as any)?.store_name || "Unknown Seller",
      variantId: selectedVariant?.id || undefined,
      variantLabel,
    };
  };

  const handleAddToCart = () => {
    const item = buildCartItem();
    for (let i = 0; i < quantity; i++) addItem(item);
    toast.success(`${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    const item = buildCartItem();
    for (let i = 0; i < quantity; i++) addItem(item);
    navigate("/checkout");
  };

  const scrollToReviews = () => {
    document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <MarketplaceLayout>
      <div className="container py-4 md:py-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            {(product as any).categories && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/search?category=${(product as any).categories.slug}`}>
                      {(product as any).categories.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          {/* Images */}
          <ProductGallery
            images={images}
            videoUrl={(product as any).video_url}
            productName={product.name}
          />

          {/* Product Info */}
          <div className="space-y-4">
            {/* Title */}
            <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Vendor */}
            <Link
              to={`/search?vendor=${product.vendor_id}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Store className="h-3.5 w-3.5" />
              Visit {(product.vendors as any)?.store_name || "Seller"} Store
            </Link>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i <= Math.round(reviewStats?.avg || 0) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <button onClick={scrollToReviews} className="text-sm text-primary hover:underline">
                {reviewStats?.avg?.toFixed(1) || "0"} ({reviewStats?.count || 0} {reviewStats?.count === 1 ? "rating" : "ratings"})
              </button>
            </div>

            <Separator />

            {/* Price */}
            <div>
              {discountPct && (
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-destructive text-destructive-foreground text-xs">
                    -{discountPct}%
                  </Badge>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(Number(product.compare_at_price))}
                  </span>
                </div>
              )}
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                {formatPrice(Number(displayPrice))}
              </p>
            </div>

            {/* Delivery info */}
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Deliver to{" "}
                <span className="font-medium text-foreground">{country.name}</span>
              </span>
            </div>

            {/* Variant Selectors */}
            {hasVariants && (
              <div className="space-y-3">
                {Object.entries(optionTypes).map(([optName, values]) => (
                  <div key={optName}>
                    <p className="text-sm font-medium mb-2">
                      {optName}: <span className="font-normal text-muted-foreground">{selectedOptions[optName]}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {values.map((val) => {
                        const isColor = optName.toLowerCase().includes("color") || optName.toLowerCase().includes("colour");
                        const selected = selectedOptions[optName] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSelectedOptions((prev) => ({ ...prev, [optName]: val }))}
                            className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all ${
                              selected
                                ? "border-primary bg-primary/5 text-primary font-medium shadow-sm"
                                : "border-border text-muted-foreground hover:border-foreground/30"
                            }`}
                            title={val}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Stock */}
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className={`text-sm font-medium ${(displayStock ?? 0) > 0 ? "text-success" : "text-destructive"}`}>
                {(displayStock ?? 0) > 0
                  ? `In Stock (${displayStock} available)`
                  : "Out of Stock"}
              </p>
            </div>

            {/* Quantity + Buttons */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Qty:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center font-medium text-sm">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                className="w-full font-semibold gap-2 h-11"
                size="lg"
                onClick={handleAddToCart}
                disabled={hasVariants && !selectedVariant}
              >
                <ShoppingCart className="h-5 w-5" />
                {t("product.addToCart")}
              </Button>

              <Button
                className="w-full font-semibold gap-2 h-11 bg-[hsl(var(--marketplace-orange))] hover:bg-[hsl(var(--marketplace-orange))]/90 text-white"
                size="lg"
                onClick={handleBuyNow}
                disabled={hasVariants && !selectedVariant}
              >
                <Zap className="h-5 w-5" />
                Buy Now
              </Button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-border pt-4 mt-2">
                <h3 className="font-semibold mb-2">{t("product.description")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <ProductReviews productId={product.id} />
      </div>
    </MarketplaceLayout>
  );
};

export default ProductDetailPage;
