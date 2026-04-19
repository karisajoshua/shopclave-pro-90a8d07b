import { useParams, useNavigate, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Phone, Globe, MapPin, ChevronRight, ShieldCheck, RotateCcw, Share2, Heart, Users, MessageCircle, ShoppingCart, Eye, Flame, Ruler, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import sizeChartJacket from "@/assets/size-chart-jacket.jpeg";
import sizeChartPants from "@/assets/size-chart-pants.jpeg";

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
import barakazIcon from "@/assets/barakaz-icon.png";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Deterministic seeded random from product ID
const seededRandom = (seed: string, min: number, max: number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
};

const seededFloat = (seed: string, min: number, max: number, decimals = 1) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const range = (max - min) * Math.pow(10, decimals);
  const val = min + (Math.abs(hash) % (range + 1)) / Math.pow(10, decimals);
  return parseFloat(val.toFixed(decimals));
};

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

        <div className="flex items-center justify-between">
          <div>
            <Link to={`/store/${vendor.slug ?? vendor.id}`} className="font-semibold text-sm text-primary hover:underline">
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
            onClick={() => requireAuth(() => followMutation.mutate())}
            disabled={followMutation.isPending}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        </div>

        <Separator />

        {/* Contact buttons */}
        <div className="space-y-2">
          {vendor.phone && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => requireAuth(handleCall)}>
              <Phone className="h-4 w-4 text-primary" />
              <span className="truncate">{user ? vendor.phone : maskPhone(vendor.phone)}</span>
            </Button>
          )}
          {vendor.phone2 && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => requireAuth(() => { trackEvent(vendor.id, productId, "call_click"); window.open(`tel:${vendor.phone2}`, "_self"); })}>
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{user ? vendor.phone2 : maskPhone(vendor.phone2)}</span>
            </Button>
          )}
          {vendor.whatsapp && (
            <Button className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => requireAuth(handleWhatsApp)}>
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </Button>
          )}
          {vendor.website && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => requireAuth(handleWebsite)}>
              <Globe className="h-4 w-4 text-primary" />
              <span className="truncate">{vendor.website}</span>
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start gap-2 border-primary/30 text-primary" onClick={() => requireAuth(onChatOpen)}>
            <MessageCircle className="h-4 w-4" />
            Chat Now
          </Button>
        </div>

        {!vendor.phone && !vendor.whatsapp && (
          <p className="text-xs text-muted-foreground text-center py-2">No contact info available</p>
        )}
      </div>

      {/* Seller Performance */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Seller Performance</h4>
        <Separator />
        <div className="space-y-1.5">
          {[
            { label: "Response Time", value: "Fast" },
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [viewingCount, setViewingCount] = useState(0);
  const { t } = useTranslation();
  const { country, formatPrice } = useLocale();
  const { addItem } = useCart();
  const { user } = useAuth();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, vendors(id, slug, store_name, phone, phone2, website, whatsapp), product_images(url, position, variant_id), categories(name, slug, parent_id)")
        .eq("slug", slug!)
        .single();
      return data as any;
    },
    enabled: !!slug,
  });

  // Dynamic viewing count
  useEffect(() => {
    if (!product?.id) return;
    const calcViewers = () => seededRandom(product.id + String(Math.floor(Date.now() / 150000)), 5, 30);
    setViewingCount(calcViewers());
    const interval = setInterval(() => setViewingCount(calcViewers()), 35000);
    return () => clearInterval(interval);
  }, [product?.id]);

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
  const displayStock = hasVariants ? (selectedVariant?.stock ?? product?.stock) : product?.stock;

  const discountPct = product?.compare_at_price && Number(product.compare_at_price) > Number(displayPrice)
    ? Math.round(((Number(product.compare_at_price) - Number(displayPrice)) / Number(product.compare_at_price)) * 100)
    : null;

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
            {/* Viewing now banner */}
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-sm">
              <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
              <span className="text-orange-700 dark:text-orange-300 font-medium">
                {viewingCount} people are viewing this right now
              </span>
            </div>

            <h1 className="font-display text-lg md:text-xl lg:text-2xl font-bold text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            {(() => {
              const hasRealReviews = (reviewStats?.count || 0) > 0;
              const displayRating = hasRealReviews ? reviewStats!.avg : seededFloat(product.id, 4.2, 4.7);
              const displayCount = hasRealReviews ? reviewStats!.count : seededRandom(product.id + "rc", 24, 156);
              const soldCount = seededRandom(product.id + "sold", 50, 500);
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i <= Math.round(displayRating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <button onClick={scrollToReviews} className="text-sm text-primary hover:underline">
                    {displayRating.toFixed(1)} ({displayCount} {displayCount === 1 ? "rating" : "ratings"})
                  </button>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{soldCount} sold</span>
                </div>
              );
            })()}

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

            {/* Size Chart (Fashion only) */}
            {(product.category_id === FASHION_CATEGORY_ID ||
              (product as any).categories?.parent_id === FASHION_CATEGORY_ID) && (
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
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Size Chart</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Jacket / Top</h3>
                      <img
                        src={sizeChartJacket}
                        alt="Jacket and top size chart"
                        className="w-full rounded-md border"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Pants</h3>
                      <img
                        src={sizeChartPants}
                        alt="Pants size chart"
                        className="w-full rounded-md border"
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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

            <Separator />

            {/* Add to Cart / Buy Now */}
            {(displayStock === undefined || displayStock === null || displayStock > 0) && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 font-semibold h-11"
                  onClick={() => {
                    const img = galleryImages[0] || barakazIcon;
                    addItem({
                      productId: product.id,
                      name: product.name,
                      price: Number(displayPrice),
                      image: img,
                      vendorId: product.vendor_id,
                      vendorName: vendor?.store_name || "",
                      variantId: selectedVariant?.id,
                      variantLabel: selectedVariant ? Object.values(selectedVariant.variant_options as Record<string, string>).join(" / ") : undefined,
                    });
                    toast.success("Added to cart!");
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
                <Button
                  className="flex-1 font-semibold h-11"
                  onClick={() => {
                    const img = galleryImages[0] || barakazIcon;
                    addItem({
                      productId: product.id,
                      name: product.name,
                      price: Number(displayPrice),
                      image: img,
                      vendorId: product.vendor_id,
                      vendorName: vendor?.store_name || "",
                      variantId: selectedVariant?.id,
                      variantLabel: selectedVariant ? Object.values(selectedVariant.variant_options as Record<string, string>).join(" / ") : undefined,
                    });
                    navigate("/checkout");
                  }}
                >
                  Buy Now
                </Button>
              </div>
            )}

            <Separator />

            {/* Social Share */}
            <SocialShare url={shareUrl} title={product.name} />
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

      {/* Floating bar on mobile - Add to Cart + Buy Now */}
      <div className="fixed bottom-14 left-0 right-0 z-40 md:hidden bg-card border-t border-border px-4 py-2 flex gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        <Button
          variant="outline"
          className="flex-1 font-semibold gap-1.5 h-11 text-xs"
          onClick={() => {
            const img = galleryImages[0] || barakazIcon;
            addItem({
              productId: product.id,
              name: product.name,
              price: Number(displayPrice),
              image: img,
              vendorId: product.vendor_id,
              vendorName: vendor?.store_name || "",
              variantId: selectedVariant?.id,
              variantLabel: selectedVariant ? Object.values(selectedVariant.variant_options as Record<string, string>).join(" / ") : undefined,
            });
            toast.success("Added to cart!");
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
        </Button>
        <Button
          className="flex-1 font-semibold h-11 text-xs"
          onClick={() => {
            const img = galleryImages[0] || barakazIcon;
            addItem({
              productId: product.id,
              name: product.name,
              price: Number(displayPrice),
              image: img,
              vendorId: product.vendor_id,
              vendorName: vendor?.store_name || "",
              variantId: selectedVariant?.id,
              variantLabel: selectedVariant ? Object.values(selectedVariant.variant_options as Record<string, string>).join(" / ") : undefined,
            });
            navigate("/checkout");
          }}
        >
          Buy Now
        </Button>
        {vendor?.phone && (
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => requireAuthMain(handleCallMobile)}>
            <Phone className="h-4 w-4" />
          </Button>
        )}
        {vendor?.whatsapp && (
          <Button size="icon" className="h-11 w-11 shrink-0 bg-green-600 hover:bg-green-700 text-white" onClick={() => requireAuthMain(handleWhatsAppMobile)}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
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
