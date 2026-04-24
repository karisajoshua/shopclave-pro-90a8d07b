import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Megaphone, Upload } from "lucide-react";

// ----- Spec definitions shown in the UI -----
const SPECS = {
  desktopBanner: { w: 1920, h: 600, maxKB: 2048, label: "Desktop Hero" },
  mobileBanner: { w: 750, h: 500, maxKB: 1024, label: "Mobile Hero" },
  brand: { w: 600, h: 600, maxKB: 1024, label: "Brand Logo" },
  product: { w: 800, h: 800, maxKB: 1024, label: "Product Spotlight" },
};

const SpecCard = ({ spec }: { spec: { w: number; h: number; maxKB: number; label: string } }) => (
  <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
    <div className="font-semibold flex items-center gap-1.5">
      <ImageIcon className="h-3.5 w-3.5" /> {spec.label} requirements
    </div>
    <div>Size: <span className="font-mono">{spec.w} × {spec.h} px</span></div>
    <div>Format: JPG, PNG or WebP</div>
    <div>Max file size: {spec.maxKB >= 1024 ? `${spec.maxKB / 1024} MB` : `${spec.maxKB} KB`}</div>
    <div className="text-muted-foreground">Tip: keep important text within the centre 60%.</div>
  </div>
);

// ----- Upload helper -----
async function uploadToBucket(file: File, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `marketing/${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

function validateFile(file: File, spec: { w: number; h: number; maxKB: number }): Promise<string | null> {
  return new Promise((resolve) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return resolve("Use JPG, PNG or WebP only");
    }
    if (file.size > spec.maxKB * 1024) {
      return resolve(`File too large (max ${spec.maxKB}KB)`);
    }
    const img = new Image();
    img.onload = () => {
      const wOff = Math.abs(img.width - spec.w) / spec.w;
      const hOff = Math.abs(img.height - spec.h) / spec.h;
      if (wOff > 0.25 || hOff > 0.25) {
        resolve(`Image is ${img.width}×${img.height}, expected ${spec.w}×${spec.h}`);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve("Could not read image");
    img.src = URL.createObjectURL(file);
  });
}

// ----- Image upload field -----
const ImageField = ({
  label,
  value,
  spec,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  spec: { w: number; h: number; maxKB: number; label: string };
  onChange: (url: string) => void;
  prefix: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    const err = await validateFile(file, spec);
    if (err) {
      toast.error(err);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToBucket(file, prefix);
      onChange(url);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <SpecCard spec={spec} />
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-3.5 w-3.5 mr-1.5" /> {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Remove
          </Button>
        )}
      </div>
      {value && (
        <div className="rounded-md overflow-hidden border bg-muted/40 max-w-xs">
          <img src={value} alt="preview" className="w-full h-auto" />
        </div>
      )}
    </div>
  );
};

// ----- Banners tab -----
const emptyBanner = {
  title: "",
  subtitle: "",
  cta_label: "",
  link_url: "/",
  desktop_image_url: "",
  mobile_image_url: "",
  display_order: 0,
  is_active: true,
};

const BannersTab = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyBanner);

  const { data: banners } = useQuery({
    queryKey: ["admin-hero-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hero_banners").select("*").order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.desktop_image_url) throw new Error("Desktop image is required");
      if (editing) {
        const { error } = await supabase.from("hero_banners").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_banners").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-banners"] });
      queryClient.invalidateQueries({ queryKey: ["public-hero-banners"] });
      toast.success("Saved");
      setOpen(false);
      setEditing(null);
      setForm(emptyBanner);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-banners"] });
      queryClient.invalidateQueries({ queryKey: ["public-hero-banners"] });
      toast.success("Deleted");
    },
  });

  const reorder = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const list = banners || [];
      const idx = list.findIndex((b: any) => b.id === id);
      const swap = list[idx + dir];
      if (!swap) return;
      const a = list[idx];
      await supabase.from("hero_banners").update({ display_order: swap.display_order }).eq("id", a.id);
      await supabase.from("hero_banners").update({ display_order: a.display_order }).eq("id", swap.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-hero-banners"] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("hero_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-banners"] });
      queryClient.invalidateQueries({ queryKey: ["public-hero-banners"] });
    },
  });

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyBanner, display_order: (banners?.length || 0) });
    setOpen(true);
  };

  const startEdit = (b: any) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      cta_label: b.cta_label || "",
      link_url: b.link_url || "/",
      desktop_image_url: b.desktop_image_url || "",
      mobile_image_url: b.mobile_image_url || "",
      display_order: b.display_order || 0,
      is_active: b.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Banners shown in the rotating hero carousel at the top of the homepage. Mobile image is shown on phones.
        </p>
        <Button onClick={startCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add banner</Button>
      </div>

      <div className="grid gap-3">
        {(banners || []).map((b: any, i: number) => (
          <Card key={b.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <img src={b.desktop_image_url} alt="" className="w-32 h-12 object-cover rounded border" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{b.title || "(no title)"}</div>
                <div className="text-xs text-muted-foreground truncate">{b.link_url}</div>
                <div className="flex gap-1 mt-1">
                  <Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px]">
                    {b.is_active ? "Live" : "Hidden"}
                  </Badge>
                  {b.mobile_image_url && <Badge variant="outline" className="text-[10px]">Mobile</Badge>}
                </div>
              </div>
              <Switch checked={b.is_active} onCheckedChange={(c) => toggleActive.mutate({ id: b.id, is_active: c })} />
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => reorder.mutate({ id: b.id, dir: -1 })} disabled={i === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => reorder.mutate({ id: b.id, dir: 1 })} disabled={i === (banners?.length || 0) - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <Button size="icon" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => confirm("Delete this banner?") && remove.mutate(b.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {!banners?.length && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No banners yet. Add one to get started.</CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit banner" : "New hero banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ImageField
              label="Desktop image *"
              value={form.desktop_image_url}
              spec={SPECS.desktopBanner}
              prefix="banners/desktop"
              onChange={(url) => setForm({ ...form, desktop_image_url: url })}
            />
            <ImageField
              label="Mobile image (optional, falls back to desktop)"
              value={form.mobile_image_url}
              spec={SPECS.mobileBanner}
              prefix="banners/mobile"
              onChange={(url) => setForm({ ...form, mobile_image_url: url })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Headline (optional)</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>CTA label (optional)</Label>
                <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Shop now" />
              </div>
            </div>
            <div>
              <Label>Subtitle (optional)</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div>
              <Label>Link URL *</Label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/search?category=fashion" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save banner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ----- Promotions tab -----
const emptyPromo = {
  kind: "brand" as "brand" | "product",
  placement: "featured_brands" as "featured_brands" | "sponsored_products",
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "/",
  display_order: 0,
  is_active: true,
};

const PromotionsTab = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyPromo);

  const { data: promos } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("placement").order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.image_url) throw new Error("Image is required");
      if (!form.title.trim()) throw new Error("Title is required");
      if (editing) {
        const { error } = await supabase.from("promotions").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promotions").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["public-promotions"] });
      toast.success("Saved");
      setOpen(false);
      setEditing(null);
      setForm(emptyPromo);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["public-promotions"] });
      toast.success("Deleted");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("promotions").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["public-promotions"] });
    },
  });

  const startCreate = () => {
    setEditing(null);
    setForm({ ...emptyPromo });
    setOpen(true);
  };

  const startEdit = (p: any) => {
    setEditing(p);
    setForm({
      kind: p.kind, placement: p.placement, title: p.title || "", subtitle: p.subtitle || "",
      image_url: p.image_url || "", link_url: p.link_url || "/", display_order: p.display_order || 0,
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const currentSpec = form.kind === "brand" ? SPECS.brand : SPECS.product;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Brand and product spotlights shown below the hero. Group them under "Featured Brands" or "Sponsored Products".
        </p>
        <Button onClick={startCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add promotion</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(promos || []).map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <img src={p.image_url} alt="" className="w-16 h-16 object-cover rounded border" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground truncate">{p.subtitle}</div>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px]">{p.kind}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.placement === "featured_brands" ? "Brands" : "Sponsored"}</Badge>
                  <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">
                    {p.is_active ? "Live" : "Hidden"}
                  </Badge>
                </div>
              </div>
              <Switch checked={p.is_active} onCheckedChange={(c) => toggleActive.mutate({ id: p.id, is_active: c })} />
              <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => confirm("Delete this promotion?") && remove.mutate(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {!promos?.length && (
          <Card className="sm:col-span-2"><CardContent className="p-6 text-center text-sm text-muted-foreground">No promotions yet.</CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit promotion" : "New promotion"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand">Brand</SelectItem>
                    <SelectItem value="product">Product spotlight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured_brands">Featured Brands</SelectItem>
                    <SelectItem value="sponsored_products">Sponsored Products</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ImageField
              label="Image *"
              value={form.image_url}
              spec={currentSpec}
              prefix={`promotions/${form.kind}`}
              onChange={(url) => setForm({ ...form, image_url: url })}
            />
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle (optional)</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Up to 50% off" />
            </div>
            <div>
              <Label>Link URL *</Label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save promotion"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminMarketing = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-5 w-5" /> Marketing</h1>
        <p className="text-muted-foreground text-sm">Manage homepage hero banners and brand/product promotions.</p>
      </div>
      <Tabs defaultValue="banners" className="w-full">
        <TabsList>
          <TabsTrigger value="banners">Hero Banners</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>
        <TabsContent value="banners" className="mt-4"><BannersTab /></TabsContent>
        <TabsContent value="promotions" className="mt-4"><PromotionsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMarketing;
