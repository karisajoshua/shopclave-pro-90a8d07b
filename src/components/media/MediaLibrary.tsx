import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getOrCreateShortLink } from "@/lib/shortLinks";
import { Copy, Pencil, Trash2, Upload as UploadIcon, RefreshCw, Plus } from "lucide-react";

type Mode = "admin" | "vendor";

interface MediaLibraryProps {
  mode: Mode;
}

interface ImageRow {
  id: string;
  url: string;
  position: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    vendor_id: string;
    vendors?: { store_name: string } | null;
  } | null;
}

const BUCKET = "product-images";

// Extract storage path from a Supabase public URL
function urlToStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

const MediaLibrary = ({ mode }: MediaLibraryProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [editing, setEditing] = useState<ImageRow | null>(null);
  const [deleting, setDeleting] = useState<ImageRow | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProductId, setUploadProductId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingFor, setReplacingFor] = useState<ImageRow | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Vendor lookup for vendor mode
  const { data: vendorRow } = useQuery({
    queryKey: ["media-vendor", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, store_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && mode === "vendor",
  });

  // Vendors list for admin filter
  const { data: vendorsList = [] } = useQuery({
    queryKey: ["media-vendors-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, store_name")
        .order("store_name");
      return data || [];
    },
    enabled: mode === "admin",
  });

  // Products list for "upload to product" picker
  const { data: productsForUpload = [] } = useQuery({
    queryKey: ["media-products-for-upload", mode, vendorRow?.id],
    queryFn: async () => {
      let q = supabase.from("products").select("id, name, vendor_id").order("name");
      if (mode === "vendor" && vendorRow?.id) q = q.eq("vendor_id", vendorRow.id);
      const { data } = await q;
      return data || [];
    },
    enabled: mode === "admin" || (mode === "vendor" && !!vendorRow?.id),
  });

  // Images
  const { data: images = [], isLoading, refetch } = useQuery({
    queryKey: ["media-images", mode, vendorRow?.id, vendorFilter],
    queryFn: async () => {
      let q = supabase
        .from("product_images")
        .select("id, url, position, product_id, products!inner(id, name, vendor_id, vendors(store_name))")
        .order("created_at", { ascending: false })
        .limit(500);

      if (mode === "vendor" && vendorRow?.id) {
        q = q.eq("products.vendor_id", vendorRow.id);
      } else if (mode === "admin" && vendorFilter !== "all") {
        q = q.eq("products.vendor_id", vendorFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as any) as ImageRow[];
    },
    enabled: mode === "admin" || (mode === "vendor" && !!vendorRow?.id),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => img.products?.name.toLowerCase().includes(q));
  }, [images, search]);

  const handleCopyShortLink = async (img: ImageRow) => {
    try {
      const shortUrl = await getOrCreateShortLink(img.url);
      await navigator.clipboard.writeText(shortUrl);
      toast({ title: "Short link copied", description: shortUrl });
    } catch (e: any) {
      toast({ title: "Could not create short link", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const path = urlToStoragePath(deleting.url);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
    const { error } = await supabase.from("product_images").delete().eq("id", deleting.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Image deleted" });
      qc.invalidateQueries({ queryKey: ["media-images"] });
    }
    setDeleting(null);
  };

  const handleSaveEdit = async (newPosition: number, newProductId: string) => {
    if (!editing) return;
    const { error } = await supabase
      .from("product_images")
      .update({ position: newPosition, product_id: newProductId })
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Image updated" });
      qc.invalidateQueries({ queryKey: ["media-images"] });
    }
    setEditing(null);
  };

  const handleReplaceFile = async (file: File) => {
    if (!replacingFor) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${replacingFor.product_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // Delete old storage object
      const oldPath = urlToStoragePath(replacingFor.url);
      if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);

      const { error: dbErr } = await supabase
        .from("product_images")
        .update({ url: pub.publicUrl })
        .eq("id", replacingFor.id);
      if (dbErr) throw dbErr;

      toast({ title: "Image replaced" });
      qc.invalidateQueries({ queryKey: ["media-images"] });
    } catch (e: any) {
      toast({ title: "Replace failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setReplacingFor(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const handleUploadFiles = async (files: FileList) => {
    if (!uploadProductId) {
      toast({ title: "Pick a product first", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Get current max position
      const { data: existing } = await supabase
        .from("product_images")
        .select("position")
        .eq("product_id", uploadProductId)
        .order("position", { ascending: false })
        .limit(1);
      let nextPos = ((existing?.[0]?.position as number) ?? -1) + 1;

      const uploads = Array.from(files).map(async (file) => {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${uploadProductId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return pub.publicUrl;
      });

      const urls = await Promise.all(uploads);
      const rows = urls.map((url) => ({
        product_id: uploadProductId,
        url,
        position: nextPos++,
      }));
      const { error: insErr } = await supabase.from("product_images").insert(rows);
      if (insErr) throw insErr;

      toast({ title: `Uploaded ${urls.length} image(s)` });
      qc.invalidateQueries({ queryKey: ["media-images"] });
      setUploadOpen(false);
      setUploadProductId("");
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden input used by Replace action */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReplaceFile(f);
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by product name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {mode === "admin" && (
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="max-w-xs w-[220px]">
              <SelectValue placeholder="All vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vendors</SelectItem>
              {vendorsList.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>{v.store_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Upload to product
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No images found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((img) => (
            <div key={img.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted">
                <img src={img.url} alt={img.products?.name || "Product image"} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-2 text-xs flex-1">
                <p className="font-medium truncate">{img.products?.name || "—"}</p>
                {mode === "admin" && img.products?.vendors?.store_name && (
                  <p className="text-muted-foreground truncate">{img.products.vendors.store_name}</p>
                )}
                <p className="text-muted-foreground">Pos: {img.position}</p>
              </div>
              <div className="p-2 pt-0 grid grid-cols-4 gap-1">
                <Button size="icon" variant="ghost" title="Copy short link" onClick={() => handleCopyShortLink(img)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" title="Replace" onClick={() => { setReplacingFor(img); replaceInputRef.current?.click(); }}>
                  <UploadIcon className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(img)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" title="Delete" onClick={() => setDeleting(img)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit image</DialogTitle>
            <DialogDescription>Change position or reassign to a different product.</DialogDescription>
          </DialogHeader>
          {editing && (
            <EditForm
              image={editing}
              products={productsForUpload}
              onCancel={() => setEditing(null)}
              onSave={handleSaveEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              The image will be removed from the product and from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload to product dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload images to product</DialogTitle>
            <DialogDescription>Pick a product and select one or more images.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Product</Label>
              <Select value={uploadProductId} onValueChange={setUploadProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {productsForUpload.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Images</Label>
              <Input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={uploading || !uploadProductId}
                onChange={(e) => {
                  if (e.target.files?.length) handleUploadFiles(e.target.files);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EditForm = ({
  image,
  products,
  onCancel,
  onSave,
}: {
  image: ImageRow;
  products: any[];
  onCancel: () => void;
  onSave: (position: number, productId: string) => void;
}) => {
  const [pos, setPos] = useState<string>(String(image.position));
  const [pid, setPid] = useState<string>(image.product_id);
  return (
    <>
      <div className="space-y-3">
        <div>
          <Label className="mb-1 block">Position</Label>
          <Input type="number" value={pos} onChange={(e) => setPos(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block">Product</Label>
          <Select value={pid} onValueChange={setPid}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {products.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(parseInt(pos, 10) || 0, pid)}>Save</Button>
      </DialogFooter>
    </>
  );
};

export default MediaLibrary;
