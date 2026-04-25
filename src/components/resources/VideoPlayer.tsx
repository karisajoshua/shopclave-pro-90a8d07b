import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  provider?: string | null; // 'upload' | 'youtube' | 'vimeo'
  poster?: string | null;
  onProgress?: (percent: number) => void;
};

const detectProvider = (url: string): "youtube" | "vimeo" | "upload" => {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/vimeo\.com/.test(url)) return "vimeo";
  return "upload";
};

const youtubeId = (url: string): string | null => {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
};

const vimeoId = (url: string): string | null => {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
};

export const VideoPlayer = ({ url, provider, poster, onProgress }: Props) => {
  const p = provider || detectProvider(url);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !onProgress) return;
    const handler = () => {
      if (!v.duration) return;
      const pct = Math.round((v.currentTime / v.duration) * 100);
      if (pct >= 80 && !marked) {
        setMarked(true);
        onProgress(100);
      }
    };
    v.addEventListener("timeupdate", handler);
    return () => v.removeEventListener("timeupdate", handler);
  }, [onProgress, marked]);

  if (p === "youtube") {
    const id = youtubeId(url);
    if (!id) return <p className="text-sm text-destructive">Invalid YouTube URL</p>;
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${id}?rel=0`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  if (p === "vimeo") {
    const id = vimeoId(url);
    if (!id) return <p className="text-sm text-destructive">Invalid Vimeo URL</p>;
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          title="Vimeo video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        src={url}
        poster={poster || undefined}
        controls
        className="w-full h-full"
      />
    </div>
  );
};

export default VideoPlayer;
