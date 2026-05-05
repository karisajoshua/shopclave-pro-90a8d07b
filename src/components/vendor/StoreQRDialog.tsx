import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";

interface StoreQRDialogProps {
  storeUrl: string;
  storeName: string;
  logoUrl?: string | null;
  trigger?: React.ReactNode;
}

const StoreQRDialog = ({ storeUrl, storeName, logoUrl, trigger }: StoreQRDialogProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success("Store link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const downloadPng = async () => {
    const svg = wrapperRef.current?.querySelector("svg");
    if (!svg) return;

    // Strip any embedded <image> from the SVG so cross-origin logos don't taint
    // the canvas during rasterization. We'll redraw the logo manually below.
    const svgClone = svg.cloneNode(true) as SVGElement;
    svgClone.querySelectorAll("image").forEach((n) => n.remove());

    const xml = new XMLSerializer().serializeToString(svgClone);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));

    const loadImage = (src: string, crossOrigin?: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (crossOrigin) img.crossOrigin = crossOrigin;
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    // Try to fetch logo as a blob (avoids canvas tainting from cross-origin)
    const fetchLogoObjectUrl = async (): Promise<string | null> => {
      if (!logoUrl) return null;
      try {
        const res = await fetch(logoUrl, { mode: "cors" });
        if (!res.ok) return null;
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    };

    try {
      const qrImg = await loadImage(`data:image/svg+xml;base64,${svg64}`);
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(qrImg, 0, 0, size, size);

      // Draw logo centered if available
      const logoObjUrl = await fetchLogoObjectUrl();
      if (logoObjUrl) {
        try {
          const logoImg = await loadImage(logoObjUrl);
          const logoSize = Math.round(size * 0.18);
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          const pad = Math.round(logoSize * 0.12);

          // White rounded background plate behind the logo
          const r = Math.round(logoSize * 0.18);
          const bx = x - pad;
          const by = y - pad;
          const bw = logoSize + pad * 2;
          const bh = logoSize + pad * 2;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(bx + r, by);
          ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
          ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
          ctx.arcTo(bx, by + bh, bx, by, r);
          ctx.arcTo(bx, by, bx + bw, by, r);
          ctx.closePath();
          ctx.fill();

          // Clip logo into a rounded square
          ctx.save();
          const lr = Math.round(logoSize * 0.15);
          ctx.beginPath();
          ctx.moveTo(x + lr, y);
          ctx.arcTo(x + logoSize, y, x + logoSize, y + logoSize, lr);
          ctx.arcTo(x + logoSize, y + logoSize, x, y + logoSize, lr);
          ctx.arcTo(x, y + logoSize, x, y, lr);
          ctx.arcTo(x, y, x + logoSize, y, lr);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          ctx.restore();
        } finally {
          URL.revokeObjectURL(logoObjUrl);
        }
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Couldn't generate QR image");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `barakaz-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch {
      toast.error("Couldn't generate QR image");
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${storeName} on Barakaz`,
          text: `Shop ${storeName} on Barakaz`,
          url: storeUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-2">
            <QrCode className="h-4 w-4" />
            Share store
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {storeName}</DialogTitle>
        </DialogHeader>

        <div ref={wrapperRef} className="flex justify-center bg-white p-4 rounded-lg border border-border">
          <QRCodeSVG
            value={storeUrl}
            size={240}
            level="H"
            marginSize={2}
            imageSettings={
              logoUrl
                ? {
                    src: logoUrl,
                    height: 48,
                    width: 48,
                    excavate: true,
                  }
                : undefined
            }
          />
        </div>

        <div className="flex gap-2">
          <Input value={storeUrl} readOnly className="text-xs" />
          <Button size="icon" variant="outline" onClick={copyLink} aria-label="Copy link">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={downloadPng} className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            Download QR
          </Button>
          <Button variant="outline" onClick={nativeShare} className="flex-1 gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Scan to open the store. Print this QR on packaging, business cards, or shop windows.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default StoreQRDialog;
