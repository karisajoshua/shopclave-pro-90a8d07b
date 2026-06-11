import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Eye, BookOpen, PlayCircle, Images, FileText, GripVertical, Star, Loader2, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { convertImageToWebp } from "@/lib/imageToWebp";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
const TYPES = [
  { value: "video", label: "Video", icon: PlayCircle },
  { value: "article", label: "Article", icon: FileText },
  { value: "gallery", label: "Image gallery", icon: Images },
];

const uploadToBucket = async (file: File, folder: string): Promise<string> => {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("vendor-resources").upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("vendor-resources").getPublicUrl(path);
  return data.publicUrl;
};

// ---------- Categories panel ----------
const CategoriesPanel = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const blank = { name: "", slug: "", description: "", icon: "BookOpen", display_order: 0, is_active: true };
  const [form, setForm] = useState<any>(blank);

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["admin-resource-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resource_categories").select("*").order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, slug: form.slug || slugify(form.name) };
      if (editing) {
        const { error } = await supabase.from("resource_categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resource_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created");
      qc.invalidateQueries({ queryKey: ["admin-resource-categories"] });
      setOpen(false); setEditing(null); setForm(blank);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resource_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["admin-resource-categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm(c); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Group lessons into topics like Getting Started, Adding Products, etc.</p>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1.5" />New category</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : cats.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No categories yet. Create your first one.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cats.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">{c.name}</h4>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description || "No description"}</p>
                <div className="flex gap-2 items-center">
                  <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                    {c.is_active ? "Active" : "Hidden"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">order: {c.display_order}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>A category groups related lessons together.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="getting-started" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Display order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label className="mb-2">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Resources panel ----------
const ResourcesPanel = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingAttach, setUploadingAttach] = useState(false);

  const blank = {
    category_id: "",
    title: "",
    slug: "",
    summary: "",
    content: "",
    resource_type: "article",
    cover_image_url: "",
    video_url: "",
    video_provider: "youtube",
    attachments: [] as { name: string; url: string; size: number }[],
    tags: [] as string[],
    difficulty: "beginner",
    duration_minutes: 5,
    display_order: 0,
    is_published: false,
    is_featured: false,
  };
  const [form, setForm] = useState<any>(blank);
  const [galleryItems, setGalleryItems] = useState<{ id?: string; url: string; caption: string; position: number }[]>([]);
  const [tagInput, setTagInput] = useState("");

  const { data: cats = [] } = useQuery({
    queryKey: ["admin-resource-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("resource_categories").select("*").order("display_order");
      return data || [];
    },
  });

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*, resource_categories(name)").order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = resources.filter((r: any) => {
    if (filterCat !== "all" && r.category_id !== filterCat) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => { setEditing(null); setForm(blank); setGalleryItems([]); setOpen(true); };
  const openEdit = async (r: any) => {
    setEditing(r);
    setForm({ ...r, tags: r.tags || [], attachments: r.attachments || [] });
    if (r.resource_type === "gallery") {
      const { data } = await supabase.from("resource_images").select("*").eq("resource_id", r.id).order("position");
      setGalleryItems((data || []).map((g: any) => ({ id: g.id, url: g.url, caption: g.caption || "", position: g.position })));
    } else {
      setGalleryItems([]);
    }
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title),
        category_id: form.category_id || null,
      };
      let resourceId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("resources").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("resources").insert(payload).select().single();
        if (error) throw error;
        resourceId = data.id;
      }
      if (form.resource_type === "gallery" && resourceId) {
        await supabase.from("resource_images").delete().eq("resource_id", resourceId);
        if (galleryItems.length) {
          const rows = galleryItems.map((g, i) => ({ resource_id: resourceId, url: g.url, caption: g.caption, position: i }));
          const { error } = await supabase.from("resource_images").insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Lesson updated" : "Lesson published");
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      setOpen(false); setEditing(null); setForm(blank); setGalleryItems([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson deleted");
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingCover(true);
    try { setForm({ ...form, cover_image_url: await uploadToBucket(f, "covers") }); }
    catch (err: any) { toast.error(err.message); }
    finally { setUploadingCover(false); e.target.value = ""; }
  };
  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 200 * 1024 * 1024) { toast.error("Video must be under 200 MB"); return; }
    setUploadingVideo(true);
    try { setForm({ ...form, video_url: await uploadToBucket(f, "videos"), video_provider: "upload" }); }
    catch (err: any) { toast.error(err.message); }
    finally { setUploadingVideo(false); e.target.value = ""; }
  };
  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploadingGallery(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadToBucket(f, "gallery")));
      setGalleryItems((prev) => [...prev, ...uploaded.map((url, i) => ({ url, caption: "", position: prev.length + i }))]);
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingGallery(false); e.target.value = ""; }
  };
  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploadingAttach(true);
    try {
      const items = await Promise.all(files.map(async (f) => ({ name: f.name, url: await uploadToBucket(f, "attachments"), size: f.size })));
      setForm({ ...form, attachments: [...(form.attachments || []), ...items] });
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingAttach(false); e.target.value = ""; }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || form.tags?.includes(t)) return;
    setForm({ ...form, tags: [...(form.tags || []), t] });
    setTagInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <Input placeholder="Search lessons..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1.5" />New lesson</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No lessons yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r: any) => {
            const TypeIcon = TYPES.find((t) => t.value === r.resource_type)?.icon || FileText;
            return (
              <Card key={r.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {r.cover_image_url ? (
                    <img src={r.cover_image_url} alt={r.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <TypeIcon className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="text-[10px] gap-1"><TypeIcon className="h-3 w-3" />{r.resource_type}</Badge>
                    {r.is_featured && <Badge className="text-[10px] gap-1 bg-warning text-warning-foreground"><Star className="h-3 w-3" />Featured</Badge>}
                  </div>
                  <Badge variant={r.is_published ? "default" : "secondary"} className="absolute top-2 right-2 text-[10px]">
                    {r.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-2">
                  <h4 className="font-semibold text-sm line-clamp-1">{r.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.summary}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{r.resource_categories?.name || "Uncategorized"}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{r.view_count}</span>
                  </div>
                  <div className="flex gap-1 pt-1 border-t">
                    <Button size="sm" variant="ghost" className="flex-1 h-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit lesson" : "New lesson"}</DialogTitle>
            <DialogDescription>Vendors will see this in Barakaz Academy.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category_id || ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.resource_type} onValueChange={(v) => setForm({ ...form, resource_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Display order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label>Short summary</Label>
              <Textarea value={form.summary || ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} maxLength={300} placeholder="Appears on cards and previews" />
            </div>

            <div>
              <Label>Full content (supports line breaks)</Label>
              <Textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Step-by-step explanation, instructions, tips…" />
            </div>

            {/* Cover */}
            <div>
              <Label>Cover image (recommended 1280×720)</Label>
              <div className="flex items-center gap-2">
                <Input value={form.cover_image_url || ""} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://… or upload" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleCover} />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>{uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Upload</>}</span>
                  </Button>
                </label>
              </div>
              {form.cover_image_url && <img src={form.cover_image_url} alt="" className="mt-2 h-24 rounded border object-cover" />}
            </div>

            {/* Video block */}
            {form.resource_type === "video" && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <Label>Video source</Label>
                <Select value={form.video_provider} onValueChange={(v) => setForm({ ...form, video_provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube link</SelectItem>
                    <SelectItem value="vimeo">Vimeo link</SelectItem>
                    <SelectItem value="upload">Upload video file</SelectItem>
                  </SelectContent>
                </Select>
                {form.video_provider === "upload" ? (
                  <div className="flex items-center gap-2">
                    <Input value={form.video_url || ""} readOnly placeholder="No file uploaded" />
                    <label className="cursor-pointer">
                      <input type="file" accept="video/*" className="hidden" onChange={handleVideo} />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>{uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" />Upload (max 200MB)</>}</span>
                      </Button>
                    </label>
                  </div>
                ) : (
                  <Input value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder={form.video_provider === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://vimeo.com/…"} />
                )}
              </div>
            )}

            {/* Gallery block */}
            {form.resource_type === "gallery" && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label>Image gallery ({galleryItems.length} items)</Label>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleGallery} />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>{uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Add images</>}</span>
                    </Button>
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {galleryItems.map((g, i) => (
                    <div key={i} className="border rounded p-2 space-y-1 bg-background">
                      <img src={g.url} alt="" className="aspect-video object-cover rounded w-full" />
                      <Input value={g.caption} onChange={(e) => setGalleryItems(galleryItems.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))} placeholder="Caption" className="h-7 text-xs" />
                      <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => setGalleryItems(galleryItems.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3 mr-1" />Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="space-y-2 border rounded-md p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>Downloadable attachments (optional)</Label>
                <label className="cursor-pointer">
                  <input type="file" multiple className="hidden" onChange={handleAttach} />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>{uploadingAttach ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Add file</>}</span>
                  </Button>
                </label>
              </div>
              {(form.attachments || []).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1 border">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate flex-1">{a.name}</span>
                  <span className="text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setForm({ ...form, attachments: form.attachments.filter((_: any, j: number) => j !== i) })}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag and press Enter" />
                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(form.tags || []).map((t: string) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button onClick={() => setForm({ ...form, tags: form.tags.filter((x: string) => x !== t) })}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-6 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label>Published (visible to vendors)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <Label>Featured</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.category_id}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editing ? "Save changes" : "Create lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Page ----------
const AdminResources = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-resource-stats"],
    queryFn: async () => {
      const [{ count: total }, { count: pub }, { data: views }] = await Promise.all([
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("resources").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("resources").select("view_count"),
      ]);
      const totalViews = (views || []).reduce((s: number, r: any) => s + (r.view_count || 0), 0);
      return { total: total || 0, published: pub || 0, totalViews };
    },
  });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Barakaz Academy"
        subtitle="Publish videos, articles, and step-by-step guides to help vendors succeed."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total lessons</p><p className="text-xl font-bold">{stats?.total ?? "–"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Published</p><p className="text-xl font-bold">{stats?.published ?? "–"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total views</p><p className="text-xl font-bold">{stats?.totalViews ?? "–"}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">Lessons</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="resources" className="mt-4"><ResourcesPanel /></TabsContent>
        <TabsContent value="categories" className="mt-4"><CategoriesPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminResources;
