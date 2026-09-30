import { Link } from "react-router-dom";
import { Star, ShoppingCart, Heart, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import barakazIcon from "@/assets/barakaz-icon.webp";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { useProductRatings } from "@/hooks/useProductRatings";
import { useLocale } from "@/hooks/useLocale";
import { useWishlist, useToggleWishlist } from "@/hooks/useWishlist";
import { estimateDeliveryWindow, formatDeliveryWindow, transitDaysForService } from "@/lib/deliveryEstimate";
import { getProductDisplayStats } from "@/lib/productDisplayStats";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  vendorId: string;
  vendorName: string;
  slug: string;
  dealEndsAt?: string | null;
  stock?: number | null;
  handlingTimeDays?: number | null;
  verifiedSeller?: boolean;
}

const ProductCard = ({
  id, name, price, compareAtPrice, image, rating, reviewCount, soldCount, vendorId, vendorName, slug, dealEndsAt,
  stock, handlingTimeDays, verifiedSeller = false,
}: ProductCardProps) => {
  const { addItem } = useCart();
  const { formatPrice } = useLocale();
  const { data: wishlistIds } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const inWishlist = wishlistIds?.has(id) ?? false;
  const discount = compareAtPrice ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

  const needsStats = rating === undefined || reviewCount === undefined || soldCount === undefined;
  const { data: stats } = useProductRatings(needsStats ? [id] : []);
  const displayStats = getProductDisplayStats(
    id,
    rating ?? stats?.[id]?.avg ?? 0,
    reviewCount ?? stats?.[id]?.count ?? 0,
    soldCount ?? stats?.[id]?.sold ?? 0,
  );
  const displayRating = displayStats.rating;
  const displayReviewCount = displayStats.reviewCount;
  const displaySoldCount = displayStats.soldCount;
  const deliveryEstimate = handlingTimeDays == null ? null : formatDeliveryWindow(estimateDeliveryWindow({
    from: new Date(),
    ...transitDaysForService("Standard Shipping"),
    handlingDays: handlingTimeDays,
  }));

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: id, name, price, image, vendorId, vendorName });
    toast.success(`${name} added to cart`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist.mutate(id);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = barakazIcon;
  };

  return (
    <Link
      to={`/product/${slug}`}
      className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={image || barakazIcon}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={handleImgError}
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-marketplace-badge text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
            -{discount}%
          </span>
        )}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center transition-colors"
        >
          <Heart
            className={`h-4 w-4 ${inWishlist ? "fill-[hsl(var(--marketplace-orange))] text-[hsl(var(--marketplace-orange))]" : "text-foreground/70"}`}
          />
        </button>
        {dealEndsAt && new Date(dealEndsAt).getTime() > Date.now() && (
          <span className="absolute bottom-2 left-2">
            <CountdownTimer endsAt={dealEndsAt} variant="badge" />
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="line-clamp-1">{vendorName}</span>
          {verifiedSeller ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verified seller" /> : null}
        </p>
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1.5 flex-1">{name}</h3>
        <div className="flex items-center gap-1 mb-2 text-xs" aria-label={`Rated ${displayRating} out of 5 from ${displayReviewCount} reviews, ${displaySoldCount} sold`}>
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < Math.round(displayRating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <span className="text-muted-foreground">({displayReviewCount})</span>
          <span className="text-muted-foreground/50" aria-hidden>·</span>
          <span className="text-muted-foreground">{displaySoldCount} sold</span>
        </div>
        {stock != null && stock > 0 && stock <= 5 ? (
          <p className="mb-1 text-xs font-semibold text-destructive">Only {stock} left</p>
        ) : null}
        {deliveryEstimate ? (
          <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Truck className="h-3.5 w-3.5 shrink-0 text-success" /> Delivery {deliveryEstimate}
          </p>
        ) : null}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">{formatPrice(price)}</p>
            {compareAtPrice && (
              <p className="text-xs text-muted-foreground line-through">{formatPrice(compareAtPrice)}</p>
            )}
          </div>
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
