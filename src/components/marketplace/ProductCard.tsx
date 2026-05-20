import { Link } from "react-router-dom";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import barakazIcon from "@/assets/barakaz-icon.png";
import CountdownTimer from "@/components/shared/CountdownTimer";
import { getDisplayProductRating } from "@/lib/product-rating-fallback";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  rating?: number;
  reviewCount?: number;
  vendorId: string;
  vendorName: string;
  slug: string;
  dealEndsAt?: string | null;
}

const ProductCard = ({
  id, name, price, compareAtPrice, image, rating = 0, reviewCount = 0, vendorId, vendorName, slug, dealEndsAt,
}: ProductCardProps) => {
  const { addItem } = useCart();
  const discount = compareAtPrice ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
  const displayRating = getDisplayProductRating(id, rating, reviewCount);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId: id, name, price, image, vendorId, vendorName });
    toast.success(`${name} added to cart`);
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
        {dealEndsAt && new Date(dealEndsAt).getTime() > Date.now() && (
          <span className="absolute bottom-2 left-2">
            <CountdownTimer endsAt={dealEndsAt} variant="badge" />
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{vendorName}</p>
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2 flex-1">{name}</h3>
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${i < Math.round(displayRating.rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">({displayRating.reviewCount})</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">${price.toLocaleString()}</p>
            {compareAtPrice && (
              <p className="text-xs text-muted-foreground line-through">${compareAtPrice.toLocaleString()}</p>
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
