import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Heart,
  LockKeyhole,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import ProductCard from "@/components/marketplace/ProductCard";
import CountdownTimer from "@/components/shared/CountdownTimer";
import ProductGallery from "@/components/product/ProductGallery";
import ProductDescriptionTabs from "@/components/product/ProductDescriptionTabs";
import ChatDialog from "@/components/shared/ChatDialog";
import SEO, { SITE_URL } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLocale } from "@/hooks/useLocale";
import { useToggleWishlist, useWishlist } from "@/hooks/useWishlist";
import { supabase } from "@/integrations/supabase/client";
import {
  clampQuantity,
  getPurchaseState,
  isOptionValueAvailable,
  normalizeSelection,
  purchaseMessage,
  remainingForCart,
} from "@/lib/productPurchase";
import barakazIcon from "@/assets/barakaz-icon.webp";
import { cn } from "@/lib/utils";

const FASHION_CATEGORY_ID = "a0000001-0000-0000-0000-000000000002";

const trackEvent = async (vendorId: string, productId: string, eventType: string) => {
  try {
    await supabase.from("vendor_analytics").insert({ vendor_id: vendorId, product_id: productId, event_type: eventType });
  } catch {
    // Analytics must never interrupt a purchase action.
  }
};

const RatingStars = ({ rating }: { rating: number }) => (
  <span className="flex" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={cn("h-4 w-4", star <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/25")}
      />
    ))}
  </span>
);

const SellerCard = ({ vendor, productId, onMessage }: { vendor: any; productId: string; onMessage: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      return Boolean(data);
    },
    enabled: Boolean(user),
  });

  const requireAuth = (action: () => void) => {
    if (!user) {
      toast.info("Please sign in to contact this seller");
      navigate("/auth");
      return;
    }
    action();
  };

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (isFollowing) {
        const { error } = await supabase.from("vendor_follows").delete().eq("user_id", user.id).eq("vendor_id", vendor.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("vendor_follows").insert({ user_id: user.id, vendor_id: vendor.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-followers", vendor.id] });
      queryClient.invalidateQueries({ queryKey: ["is-following", vendor.id] });
      toast.success(isFollowing ? "Store unfollowed" : "Store followed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const storePath = `/store/${vendor.slug ?? vendor.id}`;

  return (
    <section className="border border-border bg-card p-4" aria-labelledby="seller-heading">
      <div className="flex items-center gap-3">
        {vendor.logo_url ? (
          <img src={vendor.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-full border border-border object-cover" loading="lazy" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
            {vendor.store_name?.[0]?.toUpperCase() || "B"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link id="seller-heading" to={storePath} className="block truncate font-bold hover:text-primary">
            {vendor.store_name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {vendor.status === "approved" ? (
              <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Verified seller</span>
            ) : null}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {followerCount} followers</span>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => requireAuth(() => followMutation.mutate())}
          disabled={followMutation.isPending}
        >
          {isFollowing ? "Following" : "Follow"}
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild variant="outline"><Link to={storePath}>Visit store</Link></Button>
        <Button type="button" variant="outline" onClick={() => requireAuth(onMessage)}>
          <MessageCircle className="h-4 w-4" /> Message seller
        </Button>
      </div>
    </section>
  );
};

const TrustStrip = () => {
  const items = [
    { icon: LockKeyhole, title: "Secure payments", detail: "Protected checkout" },
    { icon: ShieldCheck, title: "Buyer protection", detail: "Shop with confidence" },
    { icon: RotateCcw, title: "Returns", detail: "7-day policy" },
    { icon: MessageCircle, title: "Canadian support", detail: "Help when needed" },
  ];
  return (
    <div className="grid grid-cols-2 border border-border bg-card sm:grid-cols-4">
      {items.map(({ icon: Icon, title, detail }) => (
        <div key={title} className="flex min-w-0 items-center gap-2 border-b border-r border-border p-3 last:border-r-0 sm:border-b-0">
          <Icon className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatPrice } = useLocale();
  const { addItem, items: cartItems } = useCart();
  const { data: wishlistIds } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*, vendors(id, slug, store_name, logo_url, status), product_images(url, position, variant_id), categories(name, slug, parent_id)")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: Boolean(slug),
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", product.id).order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(product?.id),
  });

  const { data: reviewStats = { avg: 0, count: 0 } } = useQuery({
    queryKey: ["review-stats", product?.id],
    queryFn: async () => {
      if (!product?.id) return { avg: 0, count: 0 };
      const { data, error } = await supabase.from("reviews").select("rating").eq("product_id", product.id);
      if (error) throw error;
      if (!data?.length) return { avg: 0, count: 0 };
      return { avg: data.reduce((sum, review) => sum + review.rating, 0) / data.length, count: data.length };
    },
    enabled: Boolean(product?.id),
  });

  useEffect(() => {
    if (product?.id && product.vendor_id) void trackEvent(product.vendor_id, product.id, "view");
  }, [product?.id, product?.vendor_id]);

  const optionTypes = useMemo(() => {
    const types: Record<string, string[]> = {};
    variants.forEach((variant: any) => {
      const options = (variant.variant_options || {}) as Record<string, string>;
      Object.entries(options).forEach(([name, value]) => {
        if (!types[name]) types[name] = [];
        if (!types[name].includes(value)) types[name].push(value);
      });
    });
    return types;
  }, [variants]);
  const hasVariants = Object.keys(optionTypes).length > 0;

  useEffect(() => {
    const next = hasVariants ? normalizeSelection(optionTypes, {}) : {};
    setSelectedOptions(next);
    setQty(1);
  }, [product?.id, hasVariants, optionTypes]);

  const selectedVariant = useMemo(() => {
    const keys = Object.keys(optionTypes);
    if (!hasVariants || !keys.every((key) => selectedOptions[key] != null)) return null;
    return variants.find((variant: any) => {
      const options = (variant.variant_options || {}) as Record<string, string>;
      return keys.every((key) => options[key] === selectedOptions[key]);
    }) || null;
  }, [hasVariants, optionTypes, selectedOptions, variants]);

  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const displayCompare = selectedVariant?.compare_at_price ?? product?.compare_at_price;
  const displayStock = hasVariants ? selectedVariant?.stock ?? product?.stock : product?.stock;
  const discountPct = displayCompare && Number(displayCompare) > Number(displayPrice)
    ? Math.round(((Number(displayCompare) - Number(displayPrice)) / Number(displayCompare)) * 100)
    : null;

  const purchase = getPurchaseState({
    hasVariants,
    optionKeys: Object.keys(optionTypes),
    selected: selectedOptions,
    variant: selectedVariant,
    productStock: product?.stock,
  });

  useEffect(() => {
    setQty((current) => clampQuantity(current, purchase.maxQty));
  }, [purchase.maxQty]);

  const galleryImages = useMemo(() => {
    if (!product) return [barakazIcon];
    const images = product.product_images || [];
    const colorKey = Object.keys(optionTypes).find((key) => /colou?r/i.test(key));
    if (colorKey && selectedOptions[colorKey]) {
      const ids = variants
        .filter((variant: any) => variant.variant_options?.[colorKey] === selectedOptions[colorKey])
        .map((variant: any) => variant.id);
      const matches = images.filter((image: any) => ids.includes(image.variant_id)).sort((a: any, b: any) => a.position - b.position);
      if (matches.length) return matches.map((image: any) => image.url);
    }
    if (selectedVariant) {
      const matches = images.filter((image: any) => image.variant_id === selectedVariant.id).sort((a: any, b: any) => a.position - b.position);
      if (matches.length) return matches.map((image: any) => image.url);
    }
    const general = images.filter((image: any) => !image.variant_id).sort((a: any, b: any) => a.position - b.position);
    return general.length ? general.map((image: any) => image.url) : [barakazIcon];
  }, [optionTypes, product, selectedOptions, selectedVariant, variants]);

  if (isLoading) {
    return (
      <MarketplaceLayout>
        <div className="container py-5">
          <Skeleton className="mb-4 h-4 w-56" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)]">
            <Skeleton className="aspect-square" />
            <div className="space-y-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-20 w-full" /><Skeleton className="h-12 w-48" /><Skeleton className="h-60 w-full" /></div>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!product) {
    return <MarketplaceLayout><div className="container py-16 text-center"><h1 className="text-2xl font-bold">{t("product.notFound")}</h1></div></MarketplaceLayout>;
  }

  const vendor = product.vendors as any;
  const selectionLabel = selectedVariant ? Object.values(selectedVariant.variant_options as Record<string, string>).join(" / ") : "";
  const wished = Boolean(wishlistIds?.has(product.id));
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const categoryName = product.categories?.name || "";
  const isClothing = (product.category_id === FASHION_CATEGORY_ID || product.categories?.parent_id === FASHION_CATEGORY_ID)
    && !/bag|shoe|jewelry|jewellery|accessor|luggage|watch|belt|hat|cap|sunglass/i.test(categoryName);

  const handlePurchase = (mode: "cart" | "buy") => {
    if (!purchase.canBuy) {
      toast.error(purchaseMessage(purchase));
      return;
    }
    const inCart = cartItems
      .filter((item) => item.productId === product.id && (item.variantId ?? null) === (selectedVariant?.id ?? null))
      .reduce((sum, item) => sum + item.quantity, 0);
    const room = remainingForCart(purchase.maxQty, inCart);
    if (room <= 0) {
      if (mode === "buy") navigate("/checkout");
      else toast.error("You already have all available stock in your cart");
      return;
    }
    const quantity = Math.min(qty, room);
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(displayPrice),
      image: galleryImages[0] || barakazIcon,
      vendorId: product.vendor_id,
      vendorName: vendor?.store_name || "",
      variantId: selectedVariant?.id,
      variantLabel: selectionLabel || undefined,
    }, quantity);
    if (mode === "buy") navigate("/checkout");
    else toast.success(quantity < qty ? `Added ${quantity} (stock limit)` : "Added to cart");
  };

  const shareProduct = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Product link copied");
  };

  const optionImage = (optionName: string, value: string) => {
    if (!/colou?r/i.test(optionName)) return null;
    const variant = variants.find((item: any) => item.variant_options?.[optionName] === value);
    if (!variant) return null;
    return product.product_images?.find((image: any) => image.variant_id === variant.id)?.url || null;
  };

  const scrollToReviews = () => {
    const section = document.getElementById("reviews-section");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MarketplaceLayout>
      <SEO
        title={`${product.name} — ${vendor?.store_name ?? "Barakaz"}`}
        description={product.description || `Buy ${product.name} on Barakaz.`}
        canonicalPath={`/product/${product.slug}`}
        image={galleryImages[0]}
        type="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: galleryImages.filter((url: string) => url && !url.includes("barakaz-icon")),
          description: product.description || undefined,
          sku: product.sku || product.id,
          brand: vendor?.store_name ? { "@type": "Brand", name: vendor.store_name } : undefined,
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/product/${product.slug}`,
            priceCurrency: "CAD",
            price: Number(displayPrice),
            availability: (displayStock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: vendor?.store_name ? { "@type": "Organization", name: vendor.store_name } : undefined,
          },
          aggregateRating: reviewStats.count > 0 ? { "@type": "AggregateRating", ratingValue: reviewStats.avg.toFixed(2), reviewCount: reviewStats.count } : undefined,
        }}
      />

      <div className="border-b border-border bg-card">
        <div className="container py-2.5">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap overflow-hidden text-xs">
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
              {product.categories ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink asChild><Link to={`/search?category=${product.categories.slug}`}>{product.categories.name}</Link></BreadcrumbLink></BreadcrumbItem>
                </>
              ) : null}
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="block truncate">{product.name}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="bg-muted/30 pb-8 pt-3 md:pt-5">
        <div className="container space-y-5">
          <section className="grid gap-5 bg-card p-3 md:p-5 lg:grid-cols-[minmax(0,1.04fr)_minmax(400px,.96fr)] lg:gap-7" aria-label="Product purchase information">
            <ProductGallery
              images={galleryImages}
              videoUrl={product.video_url}
              productName={product.name}
              discountPercent={discountPct}
              wished={wished}
              onToggleWishlist={() => toggleWishlist.mutate(product.id)}
            />

            <div className="min-w-0 space-y-4">
              {vendor ? (
                <Link to={`/store/${vendor.slug ?? vendor.id}`} className="text-sm font-semibold text-primary hover:underline">
                  {vendor.store_name}
                </Link>
              ) : null}
              <h1 className="text-xl font-bold leading-snug text-foreground md:text-2xl">{product.name}</h1>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {reviewStats.count > 0 ? (
                  <>
                    <RatingStars rating={reviewStats.avg} />
                    <Button type="button" variant="link" className="h-auto p-0" onClick={scrollToReviews}>
                      {reviewStats.avg.toFixed(1)} · {reviewStats.count} {reviewStats.count === 1 ? "review" : "reviews"}
                    </Button>
                  </>
                ) : (
                  <span className="text-muted-foreground">No reviews yet</span>
                )}
                <Button type="button" size="sm" variant="ghost" className="ml-auto h-8 px-2" onClick={() => void shareProduct()}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>

              <Separator />

              {product.deal_ends_at && new Date(product.deal_ends_at).getTime() > Date.now() ? <CountdownTimer endsAt={product.deal_ends_at} /> : null}

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl font-extrabold text-primary">{formatPrice(Number(displayPrice))}</p>
                {discountPct && displayCompare ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(Number(displayCompare))}</span>
                    <Badge variant="destructive">Save {discountPct}%</Badge>
                  </>
                ) : null}
              </div>

              <p className={cn("flex items-center gap-1.5 text-sm font-semibold", purchase.canBuy ? "text-success" : "text-destructive")}>
                {purchase.canBuy ? <CheckCircle2 className="h-4 w-4" /> : null}
                {purchase.canBuy ? "In stock" : purchaseMessage(purchase)}
              </p>

              {hasVariants ? (
                <div className="space-y-4 border-y border-border py-4">
                  {Object.entries(optionTypes).map(([optionName, values]) => (
                    <fieldset key={optionName}>
                      <legend className="mb-2 text-sm font-bold">
                        {optionName}: <span className="font-normal text-muted-foreground">{selectedOptions[optionName] ?? "Choose an option"}</span>
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => {
                          const selected = selectedOptions[optionName] === value;
                          const available = isOptionValueAvailable(variants as any, selectedOptions, optionName, value);
                          const image = optionImage(optionName, value);
                          return (
                            <Button
                              key={value}
                              type="button"
                              variant="outline"
                              disabled={!available}
                              aria-pressed={selected}
                              onClick={() => setSelectedOptions((current) => ({ ...current, [optionName]: value }))}
                              className={cn(
                                "h-auto min-h-10 rounded-sm px-3 py-2",
                                selected && "border-2 border-primary bg-primary/5 text-primary",
                                !available && "line-through",
                              )}
                            >
                              {image ? <img src={image} alt="" className="h-8 w-8 border border-border object-cover" /> : null}
                              {value}
                            </Button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                  {isClothing ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="link" className="h-auto p-0"><Ruler className="h-4 w-4" /> Size guide <ChevronDown className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <DialogHeader><DialogTitle>Size guide</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground">Use the seller's listed measurements in the product description and compare them with an item that fits you well. Measurements may vary by product.</p>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center gap-4">
                <span className="text-sm font-bold">Quantity</span>
                <div className="flex h-10 items-center border border-border" role="group" aria-label="Quantity">
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-none" aria-label="Decrease quantity" disabled={!purchase.canBuy || qty <= 1} onClick={() => setQty((current) => clampQuantity(current - 1, purchase.maxQty))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-bold" aria-live="polite">{qty}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-none" aria-label="Increase quantity" disabled={!purchase.canBuy || qty >= purchase.maxQty} onClick={() => setQty((current) => clampQuantity(current + 1, purchase.maxQty))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {purchase.canBuy ? <span className="text-xs text-muted-foreground">Maximum {purchase.maxQty}</span> : null}
              </div>

              <div className="hidden grid-cols-2 gap-3 md:grid">
                <Button type="button" size="lg" variant="outline" className="border-primary font-bold text-primary hover:bg-primary/5 hover:text-primary" disabled={!purchase.canBuy} onClick={() => handlePurchase("cart")}>
                  <ShoppingCart className="h-5 w-5" /> Add to cart
                </Button>
                <Button type="button" size="lg" className="font-bold" disabled={!purchase.canBuy} onClick={() => handlePurchase("buy")}>Buy now</Button>
              </div>

              <section className="border border-border bg-card" aria-labelledby="delivery-heading">
                <div className="border-b border-border px-4 py-3">
                  <h2 id="delivery-heading" className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4 text-primary" /> Delivery in Canada</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Shipping is finalized at checkout for each seller.</p>
                </div>
                <div className="divide-y divide-border px-4">
                  <div className="grid grid-cols-[1fr_auto] gap-3 py-3 text-sm">
                    <div><p className="font-semibold">Standard delivery</p><p className="text-xs text-muted-foreground">3–7 business days</p></div>
                    <span className="font-bold">CA$12.50</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-3 py-3 text-sm">
                    <div><p className="font-semibold">Express delivery</p><p className="text-xs text-muted-foreground">1–3 business days</p></div>
                    <span className="font-bold">CA$19.99</span>
                  </div>
                </div>
                <div className="flex gap-4 border-t border-border px-4 py-2 text-xs">
                  <Link to="/delivery" className="font-semibold text-primary hover:underline">Delivery details</Link>
                  <Link to="/return-policy" className="font-semibold text-primary hover:underline">7-day return policy</Link>
                </div>
              </section>

              {vendor ? <SellerCard vendor={vendor} productId={product.id} onMessage={() => setChatOpen(true)} /> : null}
              <TrustStrip />
            </div>
          </section>

          <ProductDescriptionTabs
            description={product.description}
            productId={product.id}
            reviewCount={reviewStats.count}
            meta={{
              name: product.name,
              category: product.categories?.name,
              stock: displayStock,
              vendor_name: vendor?.store_name,
              sku: product.sku,
              condition: product.condition,
              key_features: product.key_features,
              whats_in_box: product.whats_in_box,
            }}
          />

          <RelatedProducts categoryId={product.category_id} currentProductId={product.id} />
          <div className="h-24 md:hidden" />
        </div>
      </main>

      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} onClick={() => toggleWishlist.mutate(product.id)}>
            <Heart className={cn("h-5 w-5", wished && "fill-primary text-primary")} />
          </Button>
          <Button type="button" variant="outline" className="h-11 flex-1 border-primary font-bold text-primary" disabled={!purchase.canBuy} onClick={() => handlePurchase("cart")}>Add to cart</Button>
          <Button type="button" className="h-11 flex-1 font-bold" disabled={!purchase.canBuy} onClick={() => handlePurchase("buy")}>Buy now</Button>
        </div>
      </div>

      {vendor ? (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          vendorId={vendor.id}
          vendorName={vendor.store_name}
          productId={product.id}
          productName={product.name}
          productSlug={product.slug}
        />
      ) : null}
    </MarketplaceLayout>
  );
};

const RelatedProducts = ({ categoryId, currentProductId }: { categoryId: string | null; currentProductId: string }) => {
  const { data: related = [] } = useQuery({
    queryKey: ["related-products", categoryId, currentProductId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, position), vendors(store_name)")
        .eq("status", "active")
        .eq("category_id", categoryId)
        .neq("id", currentProductId)
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(categoryId),
  });

  if (!related.length) return null;
  return (
    <section className="bg-card p-4 md:p-5" aria-labelledby="related-heading">
      <h2 id="related-heading" className="mb-4 text-xl font-bold">Related products</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {related.map((item: any) => {
          const images = (item.product_images || []).sort((a: any, b: any) => a.position - b.position);
          return (
            <ProductCard
              key={item.id}
              id={item.id}
              name={item.name}
              slug={item.slug}
              price={item.price}
              compareAtPrice={item.compare_at_price}
              image={images[0]?.url || "/placeholder.svg"}
              vendorId={item.vendor_id}
              vendorName={item.vendors?.store_name || ""}
              dealEndsAt={item.deal_ends_at}
            />
          );
        })}
      </div>
    </section>
  );
};

export default ProductDetailPage;
