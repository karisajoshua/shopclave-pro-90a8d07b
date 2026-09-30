import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Play } from "lucide-react";
import barakazIcon from "@/assets/barakaz-icon.webp";
import ImageZoom from "@/components/product/ImageZoom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

interface ProductGalleryProps {
  images: string[];
  videoUrl?: string | null;
  productName: string;
  forcedImageUrl?: string | null;
  discountPercent?: number | null;
  wished?: boolean;
  onToggleWishlist?: () => void;
}

const ProductGallery = ({
  images,
  videoUrl,
  productName,
  forcedImageUrl,
  discountPercent,
  wished = false,
  onToggleWishlist,
}: ProductGalleryProps) => {
  const allImages = images.length ? images : [barakazIcon];
  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setShowVideo(false);
  }, [images]);

  const displayImage = (() => {
    if (showVideo) return null;
    if (forcedImageUrl) return forcedImageUrl;
    return allImages[activeIndex] || barakazIcon;
  })();

  const totalItems = allImages.length + (embedUrl ? 1 : 0);
  const currentPosition = showVideo ? totalItems : activeIndex + 1;

  const move = (direction: -1 | 1) => {
    if (totalItems <= 1) return;
    const current = showVideo ? allImages.length : activeIndex;
    const next = (current + direction + totalItems) % totalItems;
    if (next === allImages.length && embedUrl) setShowVideo(true);
    else {
      setShowVideo(false);
      setActiveIndex(next);
    }
  };

  const selectImage = (index: number) => {
    setActiveIndex(index);
    setShowVideo(false);
  };

  return (
    <div className="min-w-0" aria-label={`${productName} gallery`}>
      <div
        className="group relative aspect-square overflow-hidden bg-card"
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0]?.clientX;
          touchStart.current = null;
          if (start == null || end == null || Math.abs(start - end) < 45) return;
          move(start > end ? 1 : -1);
        }}
      >
        {showVideo && embedUrl ? (
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={`${productName} video`}
          />
        ) : (
          <>
            <div className="hidden h-full md:block">
              <ImageZoom src={displayImage || barakazIcon} alt={productName} />
            </div>
            <img src={displayImage || barakazIcon} alt={productName} className="h-full w-full object-contain md:hidden" />
          </>
        )}

        {discountPercent && discountPercent > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground md:left-3 md:top-3">
            -{discountPercent}%
          </span>
        ) : null}

        {onToggleWishlist ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-sm md:right-3 md:top-3 md:h-9 md:w-9"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            onClick={onToggleWishlist}
          >
            <Heart className={cn("h-5 w-5", wished && "fill-primary text-primary")} />
          </Button>
        ) : null}

        {totalItems > 1 ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute left-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full shadow-sm md:left-3 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Previous product image"
              onClick={() => move(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full shadow-sm md:right-3 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Next product image"
              onClick={() => move(1)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="absolute bottom-2 right-2 rounded-full bg-foreground/75 px-2.5 py-1 text-xs font-medium text-background md:bottom-3 md:right-3">
              {currentPosition}/{totalItems}
            </span>
          </>
        ) : null}
      </div>

      {totalItems > 1 ? (
        <>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 md:mt-3 md:gap-2" aria-label="Product thumbnails">
            {allImages.map((image, index) => (
              <Button
                key={`${image}-${index}`}
                type="button"
                variant="outline"
                aria-label={`View product image ${index + 1}`}
                aria-current={!showVideo && activeIndex === index ? "true" : undefined}
                onClick={() => selectImage(index)}
                className={cn(
                  "h-11 w-11 shrink-0 overflow-hidden rounded-sm p-0 md:h-16 md:w-16",
                  !showVideo && activeIndex === index ? "border-2 border-primary" : "border-border",
                )}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
              </Button>
            ))}
            {embedUrl ? (
              <Button
                type="button"
                variant="outline"
                aria-label="View product video"
                aria-current={showVideo ? "true" : undefined}
                onClick={() => setShowVideo(true)}
                className={cn("h-11 w-11 shrink-0 rounded-sm p-0 md:h-16 md:w-16", showVideo ? "border-2 border-primary" : "border-border")}
              >
                <Play className="h-6 w-6 text-primary" />
              </Button>
            ) : null}
          </div>
          <div className="mt-1.5 flex justify-center gap-1.5 md:hidden" aria-label="Gallery position">
            {Array.from({ length: totalItems }).map((_, index) => (
              <span
                key={index}
                className={cn("h-1.5 rounded-full transition-all", currentPosition === index + 1 ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ProductGallery;
