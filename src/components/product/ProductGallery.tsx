import { useState, useEffect } from "react";
import { Play } from "lucide-react";
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
}

const ProductGallery = ({ images, videoUrl, productName, forcedImageUrl }: ProductGalleryProps) => {
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
      if (idx >= 0) return allImages[idx];
      return forcedImageUrl;
    }
    return allImages[activeIndex] || barakazIcon;
  })();

  const totalItems = allImages.length + (embedUrl ? 1 : 0);

  return (
    <div>
      {/* Desktop: thumbnails left + main image right */}
      <div className="hidden md:flex gap-3">
        {totalItems > 1 && (
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setActiveIndex(i); setShowVideo(false); }}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 bg-secondary flex-shrink-0 transition-colors ${
                  !showVideo && activeIndex === i ? "border-primary" : "border-border"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {embedUrl && (
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 bg-secondary flex-shrink-0 flex items-center justify-center transition-colors ${
                  showVideo ? "border-primary" : "border-border"
                }`}
              >
                <Play className="h-6 w-6 text-primary" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 aspect-square rounded-lg overflow-hidden bg-secondary border border-border">
          {showVideo && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`${productName} video`}
            />
          ) : (
            <ImageZoom src={displayImage || barakazIcon} alt={productName} />
          )}
        </div>
      </div>

      {/* Mobile: main image on top, thumbnails below horizontally */}
      <div className="md:hidden">
        <div className="aspect-square rounded-lg overflow-hidden bg-secondary border border-border">
          {showVideo && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`${productName} video`}
            />
          ) : (
            <img src={displayImage || barakazIcon} alt={productName} className="w-full h-full object-cover" />
          )}
        </div>
        {totalItems > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setActiveIndex(i); setShowVideo(false); }}
                className={`w-14 h-14 rounded-md overflow-hidden border-2 bg-secondary flex-shrink-0 transition-colors ${
                  !showVideo && activeIndex === i ? "border-primary" : "border-border"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {embedUrl && (
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className={`w-14 h-14 rounded-md overflow-hidden border-2 bg-secondary flex-shrink-0 flex items-center justify-center transition-colors ${
                  showVideo ? "border-primary" : "border-border"
                }`}
              >
                <Play className="h-5 w-5 text-primary" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGallery;
