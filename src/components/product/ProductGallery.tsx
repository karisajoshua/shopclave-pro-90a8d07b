import { useState } from "react";
import { Play } from "lucide-react";
import barakazIcon from "@/assets/barakaz-icon.png";

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

interface ProductGalleryProps {
  images: string[];
  videoUrl?: string | null;
  productName: string;
}

const ProductGallery = ({ images, videoUrl, productName }: ProductGalleryProps) => {
  const allImages = images.length ? images : [barakazIcon];
  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  const totalItems = allImages.length + (embedUrl ? 1 : 0);

  return (
    <div>
      {/* Main display */}
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
          <img src={allImages[activeIndex] || barakazIcon} alt={productName} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Thumbnails */}
      {totalItems > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
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
    </div>
  );
};

export default ProductGallery;
