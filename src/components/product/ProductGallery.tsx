import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import barakazIcon from "@/assets/barakaz-icon.webp";
import ImageZoom from "@/components/product/ImageZoom";

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
  discountPct?: number | null;
}

const ProductGallery = ({ images, videoUrl, productName, forcedImageUrl, discountPct }: ProductGalleryProps) => {
  const allImages = images.length ? images : [barakazIcon];
  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setShowVideo(false);
  }, [images]);

  const displayImage = (() => {
    if (showVideo) return null;
    if (forcedImageUrl) {
      const idx = allImages.indexOf(forcedImageUrl);
      return idx >= 0 ? allImages[idx] : forcedImageUrl;
    }
    return allImages[activeIndex] || barakazIcon;
  })();

  const selectImage = (index: number) => {
    setShowVideo(false);
    setActiveIndex(index);
  };
  const previous = () => selectImage((activeIndex - 1 + allImages.length) % allImages.length);
  const next = () => selectImage((activeIndex + 1) % allImages.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden border border-border bg-white">
        {discountPct ? (
          <span className="absolute left-3 top-3 z-10 bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
            -{discountPct}%
          </span>
        ) : null}

        {showVideo && embedUrl ? (
          <iframe src={embedUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={`${productName} video`} />
        ) : (
          <>
            <div className="hidden h-full md:block">
              <ImageZoom src={displayImage || barakazIcon} alt={productName} />
            </div>
            <img src={displayImage || barakazIcon} alt={productName} className="h-full w-full object-contain md:hidden" />
          </>
        )}

        {!showVideo && allImages.length > 1 && (
          <>
            <button type="button" aria-label="Previous product image" onClick={previous} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 border border-border bg-background/95 p-2 shadow-sm hover:bg-background">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Next product image" onClick={next} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 border border-border bg-background/95 p-2 shadow-sm hover:bg-background">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {!showVideo && (
          <span className="absolute bottom-3 right-3 z-10 bg-foreground/75 px-2 py-1 text-xs font-medium text-background">
            {activeIndex + 1}/{allImages.length}
          </span>
        )}
      </div>

      {(allImages.length > 1 || embedUrl) && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button key={img + i} type="button" aria-label={`View product image ${i + 1}`} onClick={() => selectImage(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden border-2 bg-white transition-colors ${!showVideo && activeIndex === i ? "border-primary" : "border-border hover:border-muted-foreground/50"}`}>
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          {embedUrl && (
            <button type="button" aria-label="Play product video" onClick={() => setShowVideo(true)}
              className={`flex h-16 w-16 shrink-0 items-center justify-center border-2 bg-secondary ${showVideo ? "border-primary" : "border-border"}`}>
              <Play className="h-5 w-5 text-primary" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
