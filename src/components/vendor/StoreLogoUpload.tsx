import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function StoreLogoUpload({ userId, value, onChange }: { userId: string; value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { toast.error("Choose a JPG, PNG, or WebP image under 5 MB."); return; }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `uploads/${userId}/seller-logo-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) toast.error("Logo upload failed. Please try again.");
    else onChange(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    setBusy(false);
  };
  return <div className="flex items-center gap-4 rounded-lg border p-4">
    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
      {value ? <img src={value} alt="Store logo preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-muted-foreground" />}
    </div>
    <div className="space-y-2"><p className="text-sm font-medium">Store logo *</p><p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Maximum 5 MB.</p>
      <input ref={input} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e.target.files?.[0])} />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{value ? "Replace logo" : "Upload logo"}</Button>
    </div>
  </div>;
}
