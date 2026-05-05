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
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `barakaz-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
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
