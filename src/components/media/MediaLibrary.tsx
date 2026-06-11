import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { convertImageToWebp } from "@/lib/imageToWebp";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Copy, Pencil, Trash2, Upload as UploadIcon, RefreshCw, Plus, Link2 } from "lucide-react";

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

interface UploadRow {
  id: string;
  url: string;
  storage_path: string;
  file_name: string | null;
  user_id: string;
  vendor_id: string | null;
  created_at: string;
}

const BUCKET = "product-images";

function urlToStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

const MediaLibrary = ({ mode }: MediaLibraryProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"uploads" | "products">("uploads");

  // Shared
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  // Product images state
  const [editing, setEditing] = useState<ImageRow | null>(null);
  const [deleting, setDeleting] = useState<ImageRow | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProductId, setUploadProductId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingFor, setReplacingFor] = useState<ImageRow | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // My Uploads state
  const [deletingUpload, setDeletingUpload] = useState<UploadRow | null>(null);
  const [attachingUpload, setAttachingUpload] = useState<UploadRow | null>(null);
  const [attachProductId, setAttachProductId] = useState<string>("");
  const [replacingUpload, setReplacingUpload] = useState<UploadRow | null>(null);
  const replaceUploadInputRef = useRef<HTMLInputElement | null>(null);
  const standaloneInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  // Product images
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

  // My uploads
  const { data: uploads = [], isLoading: uploadsLoading, refetch: refetchUploads } = useQuery({
    queryKey: ["media-uploads", mode, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("vendor_uploads")
        .select("id, url, storage_path, file_name, user_id, vendor_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      // Vendors only see their own (RLS enforces this anyway, but explicit is faster)
      if (mode === "vendor" && user?.id) {
        q = q.eq("user_id", user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) as UploadRow[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => img.products?.name.toLowerCase().includes(q));
  }, [images, search]);

  const filteredUploads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uploads;
    return uploads.filter((u) => (u.file_name || "").toLowerCase().includes(q));
  }, [uploads, search]);

  // ---------- Shared helpers ----------
  const handleCopyShortLink = async (targetUrl: string) => {
    try {
      const shortUrl = await getOrCreateShortLink(targetUrl);
      await navigator.clipboard.writeText(shortUrl);
      toast({ title: "Short link copied", description: shortUrl });
    } catch (e: any) {
      toast({ title: "Could not create short link", description: e.message, variant: "destructive" });
    }
  };

  // ---------- Product image actions ----------
  const handleDelete = async () => {
    if (!deleting) return;
    const path = urlToStoragePath(deleting.url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
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

  const handleReplaceFile = async (rawFile: File) => {
    if (!replacingFor) return;
    setUploading(true);
    try {
      const file = await convertImageToWebp(rawFile);
      const ext = file.name.split(".").pop() || "webp";
      const path = `${replacingFor.product_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

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

  // ---------- Standalone uploads actions ----------
  const handleStandaloneUpload = async (files: FileList | File[]) => {
    if (!user) {
      toast({ title: "You must be signed in", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const arr = Array.from(files);
      const uploadOne = async (file: File) => {
        const ext = file.name.split(".").pop() || "jpg";
        const storage_path = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(storage_path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);
        return {
          user_id: user.id,
          vendor_id: vendorRow?.id ?? null,
          url: pub.publicUrl,
          storage_path,
          file_name: file.name,
        };
      };
      const rows = await Promise.all(arr.map(uploadOne));
      const { error: insErr } = await supabase.from("vendor_uploads").insert(rows);
      if (insErr) throw insErr;
      toast({ title: `Uploaded ${rows.length} image(s)` });
      qc.invalidateQueries({ queryKey: ["media-uploads"] });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (standaloneInputRef.current) standaloneInputRef.current.value = "";
    }
  };

  const handleDeleteUpload = async () => {
    if (!deletingUpload) return;
    if (deletingUpload.storage_path) {
      await supabase.storage.from(BUCKET).remove([deletingUpload.storage_path]);
    }
    const { error } = await supabase.from("vendor_uploads").delete().eq("id", deletingUpload.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Upload deleted" });
      qc.invalidateQueries({ queryKey: ["media-uploads"] });
    }
    setDeletingUpload(null);
  };

  const handleReplaceUpload = async (file: File) => {
    if (!replacingUpload || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storage_path = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(storage_path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);

      if (replacingUpload.storage_path) {
        await supabase.storage.from(BUCKET).remove([replacingUpload.storage_path]);
      }
      const { error: dbErr } = await supabase
        .from("vendor_uploads")
        .update({ url: pub.publicUrl, storage_path, file_name: file.name })
        .eq("id", replacingUpload.id);
      if (dbErr) throw dbErr;
      toast({ title: "Upload replaced" });
      qc.invalidateQueries({ queryKey: ["media-uploads"] });
    } catch (e: any) {
      toast({ title: "Replace failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setReplacingUpload(null);
      if (replaceUploadInputRef.current) replaceUploadInputRef.current.value = "";
    }
  };

  const handleAttachToProduct = async () => {
    if (!attachingUpload || !attachProductId) return;
    try {
      const { data: existing } = await supabase
        .from("product_images")
        .select("position")
        .eq("product_id", attachProductId)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = ((existing?.[0]?.position as number) ?? -1) + 1;
      const { error } = await supabase.from("product_images").insert({
        product_id: attachProductId,
        url: attachingUpload.url,
        position: nextPos,
      });
      if (error) throw error;
      toast({ title: "Attached to product" });
      qc.invalidateQueries({ queryKey: ["media-images"] });
      setAttachingUpload(null);
      setAttachProductId("");
    } catch (e: any) {
      toast({ title: "Attach failed", description: e.message, variant: "destructive" });
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-4">
      {/* Hidden inputs */}
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
      <input
        ref={replaceUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReplaceUpload(f);
        }}
      />
      <input
        ref={standaloneInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleStandaloneUpload(e.target.files);
        }}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="uploads">My Uploads</TabsTrigger>
          <TabsTrigger value="products">Product Images</TabsTrigger>
        </TabsList>

        {/* ============== MY UPLOADS TAB ============== */}
        <TabsContent value="uploads" className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) handleStandaloneUpload(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
            }`}
          >
            <UploadIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Drag & drop images here</p>
            <p className="text-xs text-muted-foreground mb-3">or pick from your device — no product needed</p>
            <Button size="sm" onClick={() => standaloneInputRef.current?.click()} disabled={uploading}>
              <Plus className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : "Upload images"}
            </Button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by file name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={() => refetchUploads()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Grid */}
          {uploadsLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : filteredUploads.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No uploads yet. Use the box above to upload your first image.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredUploads.map((u) => (
                <div key={u.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                  <div className="aspect-square bg-muted">
                    <img src={u.url} alt={u.file_name || "Upload"} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-2 text-xs flex-1">
                    <p className="font-medium truncate" title={u.file_name || ""}>{u.file_name || "Untitled"}</p>
                    <p className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="p-2 pt-0 grid grid-cols-4 gap-1">
                    <Button size="icon" variant="ghost" title="Copy short link" onClick={() => handleCopyShortLink(u.url)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Replace" onClick={() => { setReplacingUpload(u); replaceUploadInputRef.current?.click(); }}>
                      <UploadIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Attach to product" onClick={() => { setAttachingUpload(u); setAttachProductId(""); }}>
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Delete" onClick={() => setDeletingUpload(u)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============== PRODUCT IMAGES TAB ============== */}
        <TabsContent value="products" className="space-y-4">
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
              <Button size="sm" onClick={() => setUploadOpen(true)} disabled={productsForUpload.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Upload to product
              </Button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {productsForUpload.length === 0
                ? "You don't have any products yet. Use 'My Uploads' to upload images straight from your device."
                : "No images found."}
            </p>
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
                    <Button size="icon" variant="ghost" title="Copy short link" onClick={() => handleCopyShortLink(img.url)}>
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
        </TabsContent>
      </Tabs>

      {/* Edit product image dialog */}
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

      {/* Delete product image */}
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

      {/* Delete upload */}
      <AlertDialog open={!!deletingUpload} onOpenChange={(o) => !o && setDeletingUpload(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this upload?</AlertDialogTitle>
            <AlertDialogDescription>
              The image will be removed from storage. If it's attached to any product, those references will keep their copy. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUpload}>Delete</AlertDialogAction>
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

      {/* Attach upload to product */}
      <Dialog open={!!attachingUpload} onOpenChange={(o) => !o && setAttachingUpload(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach to product</DialogTitle>
            <DialogDescription>Pick a product to attach this image to as a product image.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="mb-1 block">Product</Label>
            <Select value={attachProductId} onValueChange={setAttachProductId}>
              <SelectTrigger>
                <SelectValue placeholder={productsForUpload.length === 0 ? "No products available" : "Select product…"} />
              </SelectTrigger>
              <SelectContent>
                {productsForUpload.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachingUpload(null)}>Cancel</Button>
            <Button onClick={handleAttachToProduct} disabled={!attachProductId}>Attach</Button>
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
