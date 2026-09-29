import { useParams, useNavigate, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Phone, Globe, MapPin, ChevronRight, ShieldCheck, RotateCcw, Share2, Heart, Users, MessageCircle, ShoppingCart, Eye, Truck, Ruler, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FASHION_CATEGORY_ID = "a0000001-0000-0000-0000-000000000002";
import ProductCard from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLocale } from "@/hooks/useLocale";
import ProductGallery from "@/components/product/ProductGallery";
import ProductReviews from "@/components/product/ProductReviews";
import ProductDescriptionTabs from "@/components/product/ProductDescriptionTabs";
import ChatDialog from "@/components/shared/ChatDialog";
import { useWishlist, useToggleWishlist } from "@/hooks/useWishlist";
import barakazIcon from "@/assets/barakaz-icon.webp";
import SEO, { SITE_URL } from "@/components/seo/SEO";
import { normalizeSelection, isOptionValueAvailable, getPurchaseState, clampQuantity, remainingForCart, purchaseMessage } from "@/lib/productPurchase";
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

// Track analytics event
const trackEvent = async (vendorId: string, productId: string, eventType: string) => {
  try {
    await supabase.from("vendor_analytics").insert({
      vendor_id: vendorId,
      product_id: productId,
      event_type: eventType,
    });
  } catch {}
};

// Mask a phone number for unauthenticated users
const maskPhone = (phone: string) => {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 4) + phone.slice(4).replace(/[0-9]/g, "*");
};

// Seller info sidebar component - now with contact details for classifieds model
const SellerInfoSidebar = ({ vendor, productId, onChatOpen }: { vendor: any; productId: string; onChatOpen: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const requireAuth = (action: () => void) => {
    if (!user) {
      toast.info("Please sign in to contact this seller");
      navigate("/auth");
      return;
    }
    action();
  };

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
      if (!user) return;
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

  const handleCall = () => {
    trackEvent(vendor.id, productId, "call_click");
    window.open(`tel:${vendor.phone}`, "_self");
  };

  const handleWhatsApp = () => {
    trackEvent(vendor.id, productId, "whatsapp_click");
    const msg = encodeURIComponent("Hi, I'm interested in your product on Barakaz.");
    window.open(`https://wa.me/${vendor.whatsapp?.replace(/[^0-9+]/g, "")}?text=${msg}`, "_blank");
  };

  const handleWebsite = () => {
    trackEvent(vendor.id, productId, "website_click");
    let url = vendor.website;
    if (url && !url.startsWith("http")) url = "https://" + url;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Contact Seller Card */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Contact Seller</h3>
        <Separator />

        <div className="flex items-center gap-3">
          {vendor.logo_url ? (
            <img
              src={vendor.logo_url}
              alt={vendor.store_name}
              className="h-11 w-11 rounded-full object-cover border border-border shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
              {vendor.store_name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link to={`/store/${vendor.slug ?? vendor.id}`} className="font-semibold text-sm text-primary hover:underline truncate block">
              {vendor.store_name}
            </Link>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{followerCount} Followers</span>
            </div>
          </div>
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            className="text-xs h-8 rounded-full px-4 shrink-0"
            onClick={() => requireAuth(() => followMutation.mutate())}
            disabled={followMutation.isPending}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        </div>

        <Separator />

        {/* Contact buttons (in-app chat only — no phone/WhatsApp) */}
        <div className="space-y-2">
          <Button className="w-full justify-start gap-2" onClick={() => requireAuth(onChatOpen)}>
            <MessageCircle className="h-4 w-4" />
            Message seller
          </Button>
          {vendor.website && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => requireAuth(handleWebsite)}>
              <Globe className="h-4 w-4 text-primary" />
              <span className="truncate">{vendor.website}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Only real, verifiable seller status is shown */}
      {vendor.status === "approved" && (
        <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span className="font-medium text-foreground">Verified seller</span>
        </div>
      )}
    </div>
  );
};

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const { t } = useTranslation();
  const { country, formatPrice } = useLocale();
  const { addItem, items: cartItems } = useCart();
  const { user } = useAuth();
  const { data: wishlistIds } = useWishlist();
  const toggleWishlist = useToggleWishlist();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(id, slug, store_name, logo_url, status, phone, phone2, website, whatsapp), product_images(url, position, variant_id), categories(name, slug, parent_id)")
        .eq("slug", slug!)
        .single();
      return data as any;
    },
    enabled: !!slug,
  });

  // Track product view
  useEffect(() => {
    if (product?.id && product?.vendor_id) {
      trackEvent(product.vendor_id, product.id, "view");
    }
  }, [product?.id]);

  const { data: variants } = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product!.id)
        .order("created_at", { ascending: true });
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
    if (!variants?.length) return {} as Record<string, string[]>;
    const types: Record<string, string[]> = {};
    // Walk variants in insertion (created_at asc) order; preserve first-seen order for both
    // option keys (e.g. Size before Color) and their values (e.g. S, M, L as the vendor entered).
    variants.forEach((v: any) => {
      const opts = v.variant_options as Record<string, string>;
      Object.entries(opts).forEach(([key, val]) => {
        if (!types[key]) types[key] = [];
        if (!types[key].includes(val)) types[key].push(val);
      });
    });
    return types;
  }, [variants]);

  const hasVariants = Object.keys(optionTypes).length > 0;

  // Reset/normalize selected options whenever the product (or its variants) changes,
  // so stale selections from a previous product with similar option names (e.g. "Size")
  // never leak across products and break per-variant pricing resolution.
  // Never silently default a multi-value option (prevents buying the wrong size).
  useEffect(() => {
    const next = hasVariants ? normalizeSelection(optionTypes, selectedOptions) : {};
    const same =
      Object.keys(next).length === Object.keys(selectedOptions).length &&
      Object.entries(next).every(([k, v]) => selectedOptions[k] === v);
    if (!same) setSelectedOptions(next);
    setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, variants]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants || !variants?.length) return null;
    const requiredKeys = Object.keys(optionTypes);
    if (requiredKeys.length === 0) return null;
    if (!requiredKeys.every((k) => selectedOptions[k] != null)) return null;
    return (
      variants.find((v: any) => {
        const opts = (v.variant_options || {}) as Record<string, string>;
        return requiredKeys.every((k) => opts[k] === selectedOptions[k]);
      }) || null
    );
  }, [variants, selectedOptions, hasVariants, optionTypes]);

  const displayPrice = (selectedVariant?.price ?? null) != null ? selectedVariant!.price : product?.price;
  const displayStock = hasVariants ? (selectedVariant?.stock ?? product?.stock) : product?.stock;
  const displayCompare = ((selectedVariant as any)?.compare_at_price ?? null) != null
    ? (selectedVariant as any).compare_at_price
    : product?.compare_at_price;

  const discountPct = displayCompare && Number(displayCompare) > Number(displayPrice)
    ? Math.round(((Number(displayCompare) - Number(displayPrice)) / Number(displayCompare)) * 100)
    : null;

  const purchase = getPurchaseState({
    hasVariants,
    optionKeys: Object.keys(optionTypes),
    selected: selectedOptions,
    variant: selectedVariant as any,
    productStock: product?.stock,
  });
  useEffect(() => {
    setQty((q) => clampQuantity(q, purchase.maxQty));
  }, [purchase.maxQty]);

  const galleryImages = useMemo(() => {
    if (!product) return [barakazIcon];
    const allImages = product.product_images || [];
    
    if (hasVariants && variants?.length && Object.keys(selectedOptions).length > 0) {
      const colorKey = Object.keys(optionTypes).find(k => 
        k.toLowerCase().includes('col') || k.toLowerCase().includes('colour')
      );
      
      if (colorKey && selectedOptions[colorKey]) {
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
      
      if (selectedVariant) {
        const variantImages = allImages
          .filter((img: any) => img.variant_id === selectedVariant.id)
          .sort((a: any, b: any) => a.position - b.position)
          .map((i: any) => i.url);
        if (variantImages.length > 0) return variantImages;
      }
    }
    
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

  const scrollToReviews = () => {
    document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const vendor = product.vendors as any;

  const requireAuthMain = (action: () => void) => {
    if (!user) {
      toast.info("Please sign in to contact this seller");
      navigate("/auth");
      return;
    }
    action();
  };

  const selectionLabel = selectedVariant ? Object.values(selectedVariant.variant_options as Record<string, string>).join(" / ") : "";

  // Single guarded handler shared by desktop and mobile buttons.
  const handlePurchase = (mode: "cart" | "buy") => {
    if (!purchase.canBuy) { toast.error(purchaseMessage(purchase)); return; }
    const inCart = cartItems
      .filter((i) => i.productId === product.id && (i.variantId ?? null) === (selectedVariant?.id ?? null))
      .reduce((s, i) => s + i.quantity, 0);
    const room = remainingForCart(purchase.maxQty, inCart);
    if (room <= 0) {
      if (mode === "buy") { navigate("/checkout"); return; }
      toast.error("You already have all available stock in your cart");
      return;
    }
    const qtyToAdd = Math.min(qty, room);
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(displayPrice),
      image: galleryImages[0] || barakazIcon,
      vendorId: product.vendor_id,
      vendorName: vendor?.store_name || "",
      variantId: selectedVariant?.id,
      variantLabel: selectionLabel || undefined,
    }, qtyToAdd);
    if (mode === "buy") navigate("/checkout");
    else toast.success(qtyToAdd < qty ? `Added ${qtyToAdd} (stock limit)` : "Added to cart");
  };

  const handleCallMobile = () => {
    if (vendor?.phone) {
      trackEvent(vendor.id, product.id, "call_click");
      window.open(`tel:${vendor.phone}`, "_self");
    }
  };

  const handleWhatsAppMobile = () => {
    if (vendor?.whatsapp) {
      trackEvent(vendor.id, product.id, "whatsapp_click");
      const msg = encodeURIComponent("Hi, I'm interested in your product on Barakaz.");
      window.open(`https://wa.me/${vendor.whatsapp.replace(/[^0-9+]/g, "")}?text=${msg}`, "_blank");
    }
  };

  return (
    <MarketplaceLayout>
      <SEO
        title={`${product.name} — ${vendor?.store_name ?? "Barakaz"}`}
        description={(product.description as string) || `Buy ${product.name} on Barakaz.`}
        canonicalPath={`/product/${product.slug}`}
        image={galleryImages[0]}
        type="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: galleryImages.filter((u: string) => u && !u.includes("barakaz-icon")),
          description: product.description || undefined,
          sku: product.id,
          brand: vendor?.store_name ? { "@type": "Brand", name: vendor.store_name } : undefined,
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/product/${product.slug}`,
            priceCurrency: "CAD",
            price: Number(displayPrice ?? product.price),
            availability:
              (displayStock ?? 0) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: vendor?.store_name ? { "@type": "Organization", name: vendor.store_name } : undefined,
          },
          aggregateRating:
            reviewStats && reviewStats.count > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: reviewStats.avg.toFixed(2),
                  reviewCount: reviewStats.count,
                }
              : undefined,
        }}
      />
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

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px_280px] gap-6 lg:gap-8">
          {/* Gallery */}
          <div className="order-1 lg:order-none lg:row-span-2 space-y-6">
            <ProductGallery
              images={galleryImages}
              videoUrl={(product as any).video_url}
              productName={product.name}
              forcedImageUrl={null}
            />
            <div className="hidden lg:block space-y-6">
              <ProductDescriptionTabs description={product.description} productId={product.id} meta={{ name: product.name, category: product.categories?.name, stock: product.stock, vendor_name: vendor?.store_name, sku: (product as any).sku, condition: (product as any).condition, key_features: (product as any).key_features, whats_in_box: (product as any).whats_in_box }} />
            </div>
          </div>

          {/* CENTER: Product Info */}
          <div className="order-2 lg:order-none space-y-4">
            <h1 className="font-display text-lg md:text-xl lg:text-2xl font-bold text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Rating — real reviews only */}
            {reviewStats && reviewStats.count > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`h-4 w-4 ${i <= Math.round(reviewStats.avg) ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <button onClick={scrollToReviews} className="text-sm text-primary hover:underline">
                  {reviewStats.avg.toFixed(1)} ({reviewStats.count} {reviewStats.count === 1 ? "review" : "reviews"})
                </button>
              </div>
            ) : (
              <button onClick={scrollToReviews} className="text-sm text-muted-foreground hover:underline text-left">No reviews yet</button>
            )}

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
                    {formatPrice(Number(displayCompare))}
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
                      {optName}: <span className="font-normal text-muted-foreground">{selectedOptions[optName] ?? "Select"}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {values.map((val) => {
                        const selected = selectedOptions[optName] === val;
                        const available = isOptionValueAvailable((variants || []) as any, selectedOptions, optName, val);
                        return (
                          <button
                            key={val}
                            type="button"
                            disabled={!available}
                            aria-pressed={selected}
                            onClick={() => setSelectedOptions((prev) => ({ ...prev, [optName]: val }))}
                            className={`min-w-11 px-3 py-1.5 text-sm rounded-full border-2 transition-all disabled:opacity-40 disabled:line-through disabled:cursor-not-allowed ${
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

            {/* Size Chart (Fashion clothing only — exclude bags, shoes, jewelry, accessories) */}
            {(() => {
              const isFashionCategory =
                product.category_id === FASHION_CATEGORY_ID ||
                (product as any).categories?.parent_id === FASHION_CATEGORY_ID;
              const categoryName = ((product as any).categories?.name || '').toLowerCase();
              const isNonClothing = /bag|shoe|jewelry|jewellery|accessor|luggage|watch|belt|hat|cap|sunglass/.test(categoryName);
              return isFashionCategory && !isNonClothing;
            })() && (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Ruler className="h-4 w-4" />
                    View Size Chart
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Size Chart</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-8 text-sm">
                    {/* Jacket / Top */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">Jacket / Top (cm)</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-center">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-left">Size</th>
                              <th className="px-3 py-2 font-semibold">Bust</th>
                              <th className="px-3 py-2 font-semibold">Shoulder</th>
                              <th className="px-3 py-2 font-semibold">Sleeve</th>
                              <th className="px-3 py-2 font-semibold">Length</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[
                              ["XS", "92", "41", "60", "66"],
                              ["S", "96", "42.5", "61", "68"],
                              ["M", "100", "44", "62", "70"],
                              ["L", "104", "45.5", "63", "72"],
                              ["XL", "108", "47", "64", "74"],
                              ["XXL", "112", "48.5", "65", "76"],
                              ["3XL", "116", "50", "66", "78"],
                            ].map(([size, bust, shoulder, sleeve, length]) => (
                              <tr key={size}>
                                <td className="px-3 py-2 font-medium text-left">{size}</td>
                                <td className="px-3 py-2">{bust}</td>
                                <td className="px-3 py-2">{shoulder}</td>
                                <td className="px-3 py-2">{sleeve}</td>
                                <td className="px-3 py-2">{length}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Bust: measured around the fullest part of the chest. Shoulder: from one shoulder seam to the other. Sleeve: from shoulder seam to cuff. Length: from highest point of shoulder to hem.
                      </p>
                    </div>

                    {/* Pants */}
                    <div>
                      <h3 className="text-base font-semibold mb-3">Pants (cm)</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-center">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-left">Size</th>
                              <th className="px-3 py-2 font-semibold">Waist</th>
                              <th className="px-3 py-2 font-semibold">Hip</th>
                              <th className="px-3 py-2 font-semibold">Thigh</th>
                              <th className="px-3 py-2 font-semibold">Inseam</th>
                              <th className="px-3 py-2 font-semibold">Length</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[
                              ["XS", "68", "90", "54", "74", "98"],
                              ["S", "72", "94", "56", "75", "100"],
                              ["M", "76", "98", "58", "76", "102"],
                              ["L", "80", "102", "60", "77", "104"],
                              ["XL", "84", "106", "62", "78", "106"],
                              ["XXL", "88", "110", "64", "79", "108"],
                              ["3XL", "92", "114", "66", "80", "110"],
                            ].map(([size, waist, hip, thigh, inseam, length]) => (
                              <tr key={size}>
                                <td className="px-3 py-2 font-medium text-left">{size}</td>
                                <td className="px-3 py-2">{waist}</td>
                                <td className="px-3 py-2">{hip}</td>
                                <td className="px-3 py-2">{thigh}</td>
                                <td className="px-3 py-2">{inseam}</td>
                                <td className="px-3 py-2">{length}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Waist: measured around the natural waistline. Hip: around the fullest part of the hips. Thigh: around the fullest part of the upper thigh. Inseam: from crotch seam to bottom of leg. Length: from waistband to hem.
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Measurements are approximate and may vary by ±1–2 cm. If you are between sizes, we recommend choosing the larger size.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Separator />

            {/* Stock + quantity */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className={`text-sm font-medium ${purchase.canBuy ? "text-success" : "text-destructive"}`}>
                {purchase.canBuy
                  ? purchase.maxQty <= 5 ? `Only ${purchase.maxQty} left` : "In stock"
                  : purchaseMessage(purchase)}
              </p>
              <div className="flex items-center rounded-lg border border-border" role="group" aria-label="Quantity">
                <button type="button" aria-label="Decrease quantity" className="h-9 w-9 text-lg disabled:opacity-40" disabled={!purchase.canBuy || qty <= 1} onClick={() => setQty((q) => clampQuantity(q - 1, purchase.maxQty))}>−</button>
                <span className="w-10 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                <button type="button" aria-label="Increase quantity" className="h-9 w-9 text-lg disabled:opacity-40" disabled={!purchase.canBuy || qty >= purchase.maxQty} onClick={() => setQty((q) => clampQuantity(q + 1, purchase.maxQty))}>+</button>
              </div>
            </div>

            {/* Add to Cart / Buy Now */}
            <div className="hidden md:flex gap-3">
              <Button variant="outline" className="flex-1 gap-2 font-semibold h-11" disabled={!purchase.canBuy} onClick={() => handlePurchase("cart")}>
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </Button>
              <Button className="flex-1 font-semibold h-11" disabled={!purchase.canBuy} onClick={() => handlePurchase("buy")}>
                Buy now
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label={wishlistIds?.has(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => toggleWishlist.mutate(product.id)}
              >
                <Heart className={`h-5 w-5 ${wishlistIds?.has(product.id) ? "fill-primary text-primary" : ""}`} />
              </Button>
            </div>

            {/* Delivery & returns */}
            <div className="rounded-xl border border-border bg-card divide-y divide-border text-sm">
              <div className="p-3 flex gap-3">
                <Truck className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Shipping within Canada</p>
                  <p className="text-muted-foreground">Standard CA$12.50 · Express CA$19.99 per seller. Your arrival date is shown at checkout.</p>
                  <Link to="/delivery" className="text-primary hover:underline text-xs">Delivery details</Link>
                </div>
              </div>
              <div className="p-3 flex gap-3">
                <RotateCcw className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">7-day returns</p>
                  <Link to="/return-policy" className="text-primary hover:underline text-xs">Return policy</Link>
                </div>
              </div>
              <div className="p-3 flex gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                <p className="text-muted-foreground">Payment is completed securely at checkout.</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <SocialShare url={shareUrl} title={product.name} />
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={wishlistIds?.has(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => toggleWishlist.mutate(product.id)}
              >
                <Heart className={`h-5 w-5 ${wishlistIds?.has(product.id) ? "fill-primary text-primary" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Mobile: Seller info + Description tabs */}
          <div className="order-3 lg:hidden space-y-6">
            {vendor && (
              <SellerInfoSidebar vendor={vendor} productId={product.id} onChatOpen={() => setChatOpen(true)} />
            )}
            <ProductDescriptionTabs description={product.description} productId={product.id} meta={{ name: product.name, category: product.categories?.name, stock: product.stock, vendor_name: vendor?.store_name, sku: (product as any).sku, condition: (product as any).condition, key_features: (product as any).key_features, whats_in_box: (product as any).whats_in_box }} />
          </div>

          {/* RIGHT: Seller Info */}
          <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            {vendor && (
              <SellerInfoSidebar vendor={vendor} productId={product.id} onChatOpen={() => setChatOpen(true)} />
            )}
          </div>
        </div>


        {/* Reviews are now inside the tabs */}

        {/* Related Products */}
        <RelatedProducts categoryId={product.category_id} currentProductId={product.id} />

        {/* Spacer for floating bar on mobile */}
        <div className="h-20 md:hidden" />
      </div>

      {/* Floating bar on mobile - Add to Cart + Buy Now (same guarded handler as desktop) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur border-t border-border px-4 py-2 shadow-lg">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-foreground text-sm">{formatPrice(Number(displayPrice) * qty)}</span>
          <span className="text-muted-foreground">
            {purchase.canBuy ? `Qty ${qty}${selectionLabel ? ` · ${selectionLabel}` : ""}` : purchaseMessage(purchase)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 font-semibold gap-1.5 h-11" disabled={!purchase.canBuy} onClick={() => handlePurchase("cart")}>
            <ShoppingCart className="h-4 w-4" />
            Add to cart
          </Button>
          <Button className="flex-1 font-semibold h-11" disabled={!purchase.canBuy} onClick={() => handlePurchase("buy")}>
            Buy now
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Message seller" onClick={() => requireAuthMain(() => setChatOpen(true))}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Dialog */}
      {vendor && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          vendorId={vendor.id}
          vendorName={vendor.store_name}
          productId={product.id}
          productName={product.name}
          productSlug={product.slug}
        />
      )}
    </MarketplaceLayout>
  );
};

const RelatedProducts = ({ categoryId, currentProductId }: { categoryId: string | null; currentProductId: string }) => {
  const { formatPrice } = useLocale();

  const { data: related } = useQuery({
    queryKey: ["related-products", categoryId, currentProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_images(url, position), vendors(store_name)")
        .eq("status", "active")
        .eq("category_id", categoryId!)
        .neq("id", currentProductId)
        .limit(8);
      return data || [];
    },
    enabled: !!categoryId,
  });

  if (!related?.length) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">You May Also Like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {related.map((p: any) => {
          const imgs = (p.product_images || []).sort((a: any, b: any) => a.position - b.position);
          return (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              slug={p.slug}
              price={p.price}
              compareAtPrice={p.compare_at_price}
              image={imgs[0]?.url || "/placeholder.svg"}
              vendorId={p.vendor_id}
              vendorName={(p.vendors as any)?.store_name || ""}
              dealEndsAt={p.deal_ends_at}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProductDetailPage;
