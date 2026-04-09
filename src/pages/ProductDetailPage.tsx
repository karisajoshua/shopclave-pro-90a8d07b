import { useParams, useNavigate, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, ShoppingCart, Minus, Plus, Store, MapPin, ChevronRight, Zap, ShieldCheck, Truck, RotateCcw, Share2, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
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

// Social share buttons component
const SocialShare = ({ url, title }: { url: string; title: string }) => {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const share = (platform: string) => {
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      twitter: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
    };
    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
      return;
    }
    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">SHARE:</span>
      {[
        { id: "whatsapp", label: "WhatsApp", color: "hover:text-green-600" },
        { id: "facebook", label: "Facebook", color: "hover:text-blue-600" },
        { id: "twitter", label: "X", color: "hover:text-foreground" },
        { id: "copy", label: "Copy", color: "hover:text-primary" },
      ].map((p) => (
        <button
          key={p.id}
          onClick={() => share(p.id)}
          className={`text-xs px-2 py-1 rounded border border-border text-muted-foreground ${p.color} transition-colors`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

// Seller info sidebar component
const SellerInfoSidebar = ({ vendor, productId, country }: { vendor: any; productId: string; country: any }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["vendor-followers", vendor.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_vendor_follower_count", { v_id: vendor.id });
      return data || 0;
    },
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["is-following", vendor.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("vendor_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("vendor_id", vendor.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error("Please log in to follow sellers"); return; }
      if (isFollowing) {
        await supabase.from("vendor_follows").delete().eq("user_id", user.id).eq("vendor_id", vendor.id);
      } else {
        await supabase.from("vendor_follows").insert({ user_id: user.id, vendor_id: vendor.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-followers", vendor.id] });
      queryClient.invalidateQueries({ queryKey: ["is-following", vendor.id] });
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deliveryStart = new Date();
  deliveryStart.setDate(deliveryStart.getDate() + 3);
  const deliveryEnd = new Date();
  deliveryEnd.setDate(deliveryEnd.getDate() + 7);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Delivery & Returns</h3>
        <Separator />
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Deliver to <span className="font-medium text-foreground">{country.name}</span>
          </span>
        </div>
        <div className="flex gap-3">
          <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Door Delivery</p>
            <p className="text-xs text-muted-foreground">
              Delivery between {fmtDate(deliveryStart)} and {fmtDate(deliveryEnd)}
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex gap-3">
          <RotateCcw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Return Policy</p>
            <p className="text-xs text-muted-foreground">Easy Return, Quick Refund. <Link to="/return-policy" className="text-primary hover:underline">Details</Link></p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Seller Information</h3>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Link to={`/search?vendor=${vendor.id}`} className="font-semibold text-sm text-primary hover:underline">
              {vendor.store_name}
            </Link>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{followerCount} Followers</span>
            </div>
          </div>
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            className="text-xs h-8 rounded-full px-4"
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        </div>
        <Separator />
        <h4 className="text-xs font-semibold text-muted-foreground">Seller Performance</h4>
        <div className="space-y-1.5">
          {[
            { label: "Shipping speed", value: "Excellent" },
            { label: "Quality Score", value: "Good" },
            { label: "Customer Rating", value: "Excellent" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="text-muted-foreground">{item.label}: <span className="font-medium text-foreground">{item.value}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
        .select("*, vendors(id, store_name), product_images(url, position, variant_id), categories(name, slug)")
        .eq("slug", slug!)
        .single();
      return data as any;
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

  // Compute gallery images based on selected color (show all images for that color across sizes)
  const galleryImages = useMemo(() => {
    if (!product) return [barakazIcon];
    const allImages = product.product_images || [];
    
    if (hasVariants && variants?.length && Object.keys(selectedOptions).length > 0) {
      // Find the color-like option key
      const colorKey = Object.keys(optionTypes).find(k => 
        k.toLowerCase().includes('col') || k.toLowerCase().includes('colour')
      );
      
      if (colorKey && selectedOptions[colorKey]) {
        // Get all variant IDs that share the same color
        const matchingVariantIds = variants
          .filter((v: any) => {
            const opts = v.variant_options as Record<string, string>;
            return opts[colorKey] === selectedOptions[colorKey];
          })
          .map((v: any) => v.id);
        
        const variantImages = allImages
          .filter((img: any) => matchingVariantIds.includes(img.variant_id))
          .sort((a: any, b: any) => a.position - b.position)
          .map((i: any) => i.url);
        if (variantImages.length > 0) return variantImages;
      }
      
      // Fallback: try specific variant
      if (selectedVariant) {
        const variantImages = allImages
          .filter((img: any) => img.variant_id === selectedVariant.id)
          .sort((a: any, b: any) => a.position - b.position)
          .map((i: any) => i.url);
        if (variantImages.length > 0) return variantImages;
      }
    }
    
    // Fallback to product-level images (no variant_id)
    const productImages = allImages
      .filter((img: any) => !img.variant_id)
      .sort((a: any, b: any) => a.position - b.position)
      .map((i: any) => i.url);
    
    return productImages.length > 0 ? productImages : [barakazIcon];
  }, [product, selectedVariant, selectedOptions, variants, optionTypes, hasVariants]);

  if (isLoading) {
    return (
      <MarketplaceLayout>
        <div className="container py-6">
          <Skeleton className="h-4 w-48 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-64 rounded-lg hidden lg:block" />
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

  const buildCartItem = () => {
    const variantLabel = hasVariants
      ? Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(", ")
      : undefined;
    return {
      productId: product.id,
      name: product.name,
      price: Number(displayPrice),
      image: galleryImages[0],
      vendorId: product.vendor_id,
      vendorName: (product.vendors as any)?.store_name || "Unknown Seller",
      variantId: selectedVariant?.id || undefined,
      variantLabel,
    };
  };

  const handleAddToCart = () => {
    const item = buildCartItem();
    addItem(item, quantity);
    toast.success(`${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    const item = buildCartItem();
    addItem(item, quantity);
    navigate("/checkout", { state: { fromBuyNow: true } });
  };

  const scrollToReviews = () => {
    document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

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

        {/* 3-Column Layout - using CSS order for mobile reordering */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px_280px] gap-6 lg:gap-8">
          {/* Gallery - order 1 on mobile, natural on desktop */}
          <div className="order-1 lg:order-none lg:row-span-2 space-y-6">
            <ProductGallery
              images={galleryImages}
              videoUrl={(product as any).video_url}
              productName={product.name}
              forcedImageUrl={null}
            />

            {/* Description - hidden on mobile, shown on desktop below gallery */}
            <div className="hidden lg:block">
              {product.description && (
                <div className="bg-card rounded-lg border border-border p-4">
                  <h3 className="font-semibold mb-2">{t("product.description")}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CENTER: Product Info + Buy Box - order 2 on mobile */}
          <div className="order-2 lg:order-none space-y-4">
            {/* Title */}
            <h1 className="font-display text-lg md:text-xl lg:text-2xl font-bold text-foreground leading-tight">
              {product.name}
            </h1>

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

            {/* Countdown Timer */}
            {(product as any).deal_ends_at && new Date((product as any).deal_ends_at).getTime() > Date.now() && (
              <CountdownTimer endsAt={(product as any).deal_ends_at} />
            )}

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
              <p className="text-2xl font-bold text-foreground">
                {formatPrice(Number(displayPrice))}
              </p>
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

            <Separator />

            {/* Social Share */}
            <SocialShare url={shareUrl} title={product.name} />
          </div>

          {/* Description on mobile only - order 3 */}
          <div className="order-3 lg:hidden">
            {product.description && (
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="font-semibold mb-2">{t("product.description")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Delivery + Seller Info - order 4 on mobile, hidden on mobile (shown separately below) */}
          <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            {product.vendors && (
              <SellerInfoSidebar
                vendor={product.vendors}
                productId={product.id}
                country={country}
              />
            )}
          </div>
        </div>

        {/* Mobile: show seller info below */}
        <div className="lg:hidden mt-6">
          {product.vendors && (
            <SellerInfoSidebar
              vendor={product.vendors}
              productId={product.id}
              country={country}
            />
          )}
        </div>

        {/* Reviews Section */}
        <ProductReviews productId={product.id} />
      </div>
    </MarketplaceLayout>
  );
};

export default ProductDetailPage;
