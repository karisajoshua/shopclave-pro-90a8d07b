import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, Layers, Upload, Video, ImageIcon, ChevronRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = [
  { label: "Category", icon: "1" },
  { label: "Details", icon: "2" },
  { label: "Pricing", icon: "3" },
  { label: "Media", icon: "4" },
  { label: "Variants", icon: "5" },
  { label: "Review", icon: "6" },
];

const MAX_DESC = 850;

interface OptionType { name: string; values: string[]; }
interface VariantRow { id?: string; options: Record<string, string>; price: string; compareAtPrice: string; stock: string; sku: string; imageFiles: File[]; imagePreviews: string[]; existingImageUrls: string[]; }
interface ImageFile { file?: File; url: string; preview: string; dbId?: string; }

function generateCombinations(optionTypes: OptionType[]): Record<string, string>[] {
  const filtered = optionTypes.filter(o => o.name && o.values.length > 0);
  if (!filtered.length) return [];
  let combos: Record<string, string>[] = [{}];
  for (const opt of filtered) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) for (const val of opt.values) next.push({ ...combo, [opt.name]: val });
    combos = next;
  }
  return combos;
}

const EditProductPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: productId } = useParams<{ id: string }>();
  const { vendor } = useOutletContext<{ vendor: any }>();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Category state
  const [cat1, setCat1] = useState("");
  const [cat2, setCat2] = useState("");
  const [cat3, setCat3] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "", description: "", price: "", compareAtPrice: "", bulkPrice: "",
    stock: "0", sku: "", status: "active", condition: "new", delivery: "",
  });
  const [keyFeatures, setKeyFeatures] = useState<string[]>([""]);
  const [whatsInBoxItems, setWhatsInBoxItems] = useState<string[]>([""]);
  const [showBulkPrice, setShowBulkPrice] = useState(false);

  // Media state
  const [images, setImages] = useState<ImageFile[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([{ name: "", values: [] }]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const variantFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Categories query
  const { data: categories = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, parent_id, slug").order("name");
      return data || [];
    },
  });

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["edit-product", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_images(id, url, position, variant_id), product_variants(*)")
        .eq("id", productId!)
        .single();
      return data;
    },
    enabled: !!productId,
  });

  // Populate form when product loads
  useEffect(() => {
    if (!product || !categories.length) return;
    const p = product as any;
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      compareAtPrice: p.compare_at_price ? String(p.compare_at_price) : "",
      bulkPrice: "",
      stock: String(p.stock),
      sku: p.sku || "",
      status: p.status,
      condition: p.condition || "new",
      delivery: "",
    });
    setKeyFeatures(p.key_features?.length ? [...p.key_features] : [""]);
    setWhatsInBoxItems(Array.isArray(p.whats_in_box) && p.whats_in_box.length ? [...p.whats_in_box] : [""]);
    setVideoUrl(p.video_url || "");

    // Resolve category hierarchy
    if (p.category_id) {
      const cat = categories.find((c: any) => c.id === p.category_id);
      if (cat) {
        if (cat.parent_id) {
          const parent = categories.find((c: any) => c.id === cat.parent_id);
          if (parent && parent.parent_id) {
            setCat1(parent.parent_id);
            setCat2(parent.id);
            setCat3(cat.id);
          } else if (parent) {
            setCat1(parent.id);
            setCat2(cat.id);
            setCat3("");
          } else {
            setCat1(cat.id);
          }
        } else {
          setCat1(cat.id);
        }
      }
    }

    // Load existing product-level images
    const existingImages: ImageFile[] = (p.product_images || [])
      .filter((img: any) => !img.variant_id)
      .sort((a: any, b: any) => a.position - b.position)
      .map((img: any) => ({ url: img.url, preview: img.url, dbId: img.id }));
    setImages(existingImages);

    // Load existing variants
    const existingVariants = p.product_variants || [];
    if (existingVariants.length > 0) {
      setHasVariants(true);
      const types: Record<string, Set<string>> = {};
      existingVariants.forEach((v: any) => {
        const opts = v.variant_options as Record<string, string>;
        Object.entries(opts).forEach(([key, val]) => {
          if (!types[key]) types[key] = new Set();
          types[key].add(val);
        });
      });
      setOptionTypes(Object.entries(types).map(([name, vals]) => ({ name, values: Array.from(vals) })));
      const allProductImages = p.product_images || [];
      setVariantRows(existingVariants.map((v: any) => {
        const variantImgs = allProductImages
          .filter((img: any) => img.variant_id === v.id)
          .sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => img.url);
        return {
          id: v.id,
          options: v.variant_options as Record<string, string>,
          price: v.price ? String(v.price) : "",
          compareAtPrice: v.compare_at_price ? String(v.compare_at_price) : "",
          stock: String(v.stock),
          sku: v.sku || "",
          imageFiles: [],
          imagePreviews: [],
          existingImageUrls: variantImgs.length > 0 ? variantImgs : (v.image_url ? [v.image_url] : []),
        };
      }));
    }
  }, [product, categories]);

  const level1 = useMemo(() => categories.filter((c: any) => !c.parent_id), [categories]);
  const level2 = useMemo(() => cat1 ? categories.filter((c: any) => c.parent_id === cat1) : [], [categories, cat1]);
  const level3 = useMemo(() => cat2 ? categories.filter((c: any) => c.parent_id === cat2) : [], [categories, cat2]);

  const selectedCategoryId = cat3 || cat2 || cat1;
  const categoryPath = useMemo(() => {
    const parts: string[] = [];
    if (cat1) parts.push(categories.find((c: any) => c.id === cat1)?.name || "");
    if (cat2) parts.push(categories.find((c: any) => c.id === cat2)?.name || "");
    if (cat3) parts.push(categories.find((c: any) => c.id === cat3)?.name || "");
    return parts.filter(Boolean);
  }, [cat1, cat2, cat3, categories]);

  // Image handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files.map(f => ({ file: f, url: "", preview: URL.createObjectURL(f) }))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const uploadImages = async (prodId: string): Promise<{ url: string; dbId?: string }[]> => {
    const results = await Promise.all(images.map(async (img) => {
      if (img.file) {
        const ext = img.file.name.split(".").pop();
        const path = `${prodId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, img.file);
        if (error) throw error;
        return { url: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl };
      }
      return img.url ? { url: img.url, dbId: img.dbId } : null;
    }));
    return results.filter((r): r is NonNullable<typeof r> => !!r);
  };

  const uploadVariantImages = async (files: File[], prodId: string): Promise<string[]> => {
    return Promise.all(files.map(async (file) => {
      const ext = file.name.split(".").pop();
      const path = `${prodId}/variant-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }));
  };

  // Variant handlers
  const regenerateVariants = (opts: OptionType[]) => {
    const combos = generateCombinations(opts);
    setVariantRows(prev => combos.map(options => {
      const key = JSON.stringify(options);
      const existing = prev.find(r => JSON.stringify(r.options) === key);
      return existing || { options, price: "", compareAtPrice: "", stock: "0", sku: "", imageFiles: [], imagePreviews: [], existingImageUrls: [] };
    }));
  };
  const addOptionType = () => setOptionTypes([...optionTypes, { name: "", values: [] }]);
  const removeOptionType = (idx: number) => { const next = optionTypes.filter((_, i) => i !== idx); setOptionTypes(next); regenerateVariants(next); };
  const updateOptionName = (idx: number, name: string) => { const next = [...optionTypes]; next[idx] = { ...next[idx], name }; setOptionTypes(next); regenerateVariants(next); };
  const addOptionValue = (idx: number) => {
    const val = (newValueInputs[idx] || "").trim();
    if (!val) return;
    const next = [...optionTypes];
    if (next[idx].values.includes(val)) return;
    next[idx] = { ...next[idx], values: [...next[idx].values, val] };
    setOptionTypes(next); setNewValueInputs({ ...newValueInputs, [idx]: "" }); regenerateVariants(next);
  };
  const removeOptionValue = (optIdx: number, valIdx: number) => { const next = [...optionTypes]; next[optIdx] = { ...next[optIdx], values: next[optIdx].values.filter((_, i) => i !== valIdx) }; setOptionTypes(next); regenerateVariants(next); };
  const updateVariantRow = (idx: number, field: keyof VariantRow, value: string) => { const next = [...variantRows]; next[idx] = { ...next[idx], [field]: value }; setVariantRows(next); };
  const handleVariantImageSelect = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [...variantRows];
    next[idx] = { ...next[idx], imageFiles: [...next[idx].imageFiles, ...files], imagePreviews: [...next[idx].imagePreviews, ...files.map(f => URL.createObjectURL(f))] };
    setVariantRows(next);
    if (variantFileRefs.current[idx]) variantFileRefs.current[idx]!.value = "";
  };
  const removeVariantImage = (vi: number, ii: number, isExisting: boolean) => {
    const next = [...variantRows];
    if (isExisting) {
      next[vi] = { ...next[vi], existingImageUrls: next[vi].existingImageUrls.filter((_, i) => i !== ii) };
    } else {
      const adj = ii - next[vi].existingImageUrls.length;
      next[vi] = { ...next[vi], imageFiles: next[vi].imageFiles.filter((_, i) => i !== adj), imagePreviews: next[vi].imagePreviews.filter((_, i) => i !== adj) };
    }
    setVariantRows(next);
  };

  // Validation per step
  const validateStep = (): boolean => {
    switch (step) {
      case 0: if (!selectedCategoryId) { toast.error("Please select a category"); return false; } return true;
      case 1: if (!form.name.trim()) { toast.error("Product name is required"); return false; } if (!form.description.trim()) { toast.error("Description is required"); return false; } return true;
      case 2: if (!form.price || parseFloat(form.price) <= 0) { toast.error("Price is required"); return false; } return true;
      case 3: return true;
      case 4: if (hasVariants && variantRows.length === 0) { toast.error("Add at least one variant option with values"); return false; } return true;
      default: return true;
    }
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  // Submit
  const handleSubmit = async () => {
    if (!vendor || !productId) return;
    setLoading(true);
    try {
      const cleanFeatures = keyFeatures.map(f => f.trim()).filter(Boolean);
      const { error } = await supabase.from("products").update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        compare_at_price: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        stock: hasVariants ? variantRows.reduce((s, v) => s + (parseInt(v.stock) || 0), 0) : parseInt(form.stock) || 0,
        category_id: selectedCategoryId || null,
        status: form.status,
        video_url: videoUrl.trim() || null,
        sku: form.sku.trim() || undefined,
        key_features: cleanFeatures.length > 0 ? cleanFeatures : null,
        condition: form.condition,
        whats_in_box: (() => { const clean = whatsInBoxItems.map(s => s.trim()).filter(Boolean); return clean.length > 0 ? clean : null; })(),
      } as any).eq("id", productId);
      if (error) throw error;

      // Handle images
      const uploadedImages = await uploadImages(productId);
      await supabase.from("product_images").delete().eq("product_id", productId);
      if (uploadedImages.length > 0) {
        await supabase.from("product_images").insert(uploadedImages.map((img, idx) => ({ product_id: productId, url: img.url, position: idx })));
      }

      // Handle variants
      await supabase.from("product_variants").delete().eq("product_id", productId);
      if (hasVariants && variantRows.length > 0) {
        await Promise.all(variantRows.map(async (v) => {
          const newUrls = v.imageFiles.length > 0 ? await uploadVariantImages(v.imageFiles, productId) : [];
          const allUrls = [...v.existingImageUrls, ...newUrls];
          const { data: variant, error: vErr } = await supabase.from("product_variants").insert({
            product_id: productId, variant_options: v.options,
            price: v.price ? parseFloat(v.price) : null,
            compare_at_price: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
            stock: parseInt(v.stock) || 0,
            sku: v.sku.trim() || null, image_url: allUrls[0] || null,
          } as any).select("id").single();
          if (vErr) throw vErr;
          if (allUrls.length > 0 && variant) {
            await supabase.from("product_images").insert(allUrls.map((url, idx) => ({ product_id: productId, variant_id: variant.id, url, position: idx })));
          }
        }));
      }

      toast.success("Product updated!");
      navigate("/vendor/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally { setLoading(false); }
  };

  if (productLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-12 text-muted-foreground">Product not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Edit Product</h2>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => { if (i < step) setStep(i); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? "bg-primary text-primary-foreground" :
                i < step ? "bg-primary/20 text-primary cursor-pointer" :
                "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span>{s.icon}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        {/* Step 0: Category Selection */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Select Category</h3>
            <p className="text-sm text-muted-foreground">Choose the category that best fits your product.</p>

            {categoryPath.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {categoryPath.map((name, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <Badge variant="secondary" className="text-xs">{name}</Badge>
                  </span>
                ))}
              </div>
            )}

            <div>
              <Label>Main Category *</Label>
              <Select value={cat1} onValueChange={(v) => { setCat1(v); setCat2(""); setCat3(""); }}>
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {level1.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {level2.length > 0 && (
              <div>
                <Label>Sub-category</Label>
                <Select value={cat2} onValueChange={(v) => { setCat2(v); setCat3(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                  <SelectContent>
                    {level2.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {level3.length > 0 && (
              <div>
                <Label>Final Sub-category</Label>
                <Select value={cat3} onValueChange={setCat3}>
                  <SelectTrigger><SelectValue placeholder="Select final sub-category" /></SelectTrigger>
                  <SelectContent>
                    {level3.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Product Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Product Details</h3>
            <div>
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter product name" />
            </div>
            <div>
              <Label>Condition *</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Description *</Label>
                <span className={`text-xs ${form.description.length >= MAX_DESC ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.description.length}/{MAX_DESC}
                </span>
              </div>
              <Textarea
                value={form.description}
                onChange={(e) => { if (e.target.value.length <= MAX_DESC) setForm({ ...form, description: e.target.value }); }}
                rows={5}
                placeholder="Describe your product in detail..."
              />
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block">Key Features</Label>
              <p className="text-xs text-muted-foreground mb-2">Add features one per line. These appear independently in the product specifications.</p>
              {keyFeatures.map((feat, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={feat}
                    onChange={(e) => { const next = [...keyFeatures]; next[i] = e.target.value; setKeyFeatures(next); }}
                    placeholder={`Feature ${i + 1}`}
                  />
                  {keyFeatures.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive shrink-0" onClick={() => setKeyFeatures(keyFeatures.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setKeyFeatures([...keyFeatures, ""])}>
                <Plus className="h-3.5 w-3.5" /> Add Feature
              </Button>
            </div>

            <div>
              <Label className="mb-2 block">What's in the Box</Label>
              <p className="text-xs text-muted-foreground mb-2">Add items one per line.</p>
              {whatsInBoxItems.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={item}
                    onChange={(e) => { const next = [...whatsInBoxItems]; next[i] = e.target.value; setWhatsInBoxItems(next); }}
                    placeholder={`Item ${i + 1}, e.g. 1 x ${form.name || "Product"}`}
                  />
                  {whatsInBoxItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive shrink-0" onClick={() => setWhatsInBoxItems(whatsInBoxItems.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setWhatsInBoxItems([...whatsInBoxItems, ""])}>
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing & Stock */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Pricing & Stock</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (KSh) *</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Compare at Price</Label>
                <Input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
              </div>
            </div>

            <div>
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => setShowBulkPrice(!showBulkPrice)}>
                {showBulkPrice ? "Hide" : "+ Add"} Bulk Price
              </button>
              {showBulkPrice && (
                <div className="mt-2">
                  <Label>Bulk Price (KSh)</Label>
                  <Input type="number" min="0" step="0.01" value={form.bulkPrice} onChange={(e) => setForm({ ...form, bulkPrice: e.target.value })} placeholder="Price for bulk orders" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock Quantity</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if empty" />
              </div>
            </div>

            <div>
              <Label>Delivery Options</Label>
              <Select value={form.delivery} onValueChange={(v) => setForm({ ...form, delivery: v })}>
                <SelectTrigger><SelectValue placeholder="Select delivery option" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Delivery</SelectItem>
                  <SelectItem value="express">Express Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup Only</SelectItem>
                  <SelectItem value="both">Delivery & Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Media */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Images & Media</h3>
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-secondary group">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-0.5 left-0.5 bg-background/80 text-[10px] px-1 rounded font-medium">{idx + 1}</span>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                <Upload className="h-5 w-5" /><span className="text-[10px]">Upload</span>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            <p className="text-xs text-muted-foreground">First image will be the main product image.</p>

            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Video className="h-4 w-4 text-muted-foreground" />
                <Label>Video URL (YouTube or Vimeo)</Label>
              </div>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>
        )}

        {/* Step 4: Variants */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Product Variations</h3>
              </div>
              <Switch checked={hasVariants} onCheckedChange={setHasVariants} />
            </div>

            {hasVariants && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Define option types (e.g. Size, Color) and their values.</p>
                {optionTypes.map((opt, optIdx) => (
                  <div key={optIdx} className="bg-secondary/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input placeholder="Option name (e.g. Size)" value={opt.name} onChange={(e) => updateOptionName(optIdx, e.target.value)} className="flex-1" />
                      {optionTypes.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeOptionType(optIdx)}><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {opt.values.map((val, valIdx) => (
                        <span key={valIdx} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                          {val}
                          <button type="button" onClick={() => removeOptionValue(optIdx, valIdx)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Add value (e.g. S, M, L)" value={newValueInputs[optIdx] || ""} onChange={(e) => setNewValueInputs({ ...newValueInputs, [optIdx]: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOptionValue(optIdx); } }} className="flex-1" />
                      <Button type="button" variant="outline" size="sm" onClick={() => addOptionValue(optIdx)}>Add</Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addOptionType}><Plus className="h-3.5 w-3.5" /> Add Option Type</Button>

                {variantRows.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2 block">Variant Combinations ({variantRows.length})</Label>
                    <div className="space-y-3">
                      {variantRows.map((row, idx) => (
                        <div key={idx} className="bg-card border border-border rounded-lg p-3 space-y-3">
                          <p className="text-xs font-semibold text-foreground">{Object.entries(row.options).map(([k, v]) => `${k}: ${v}`).join(" / ")}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Original Price (KSh)</Label>
                              <Input type="number" min="0" step="0.01" placeholder={form.compareAtPrice || "Optional"} value={row.compareAtPrice} onChange={(e) => updateVariantRow(idx, "compareAtPrice", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Current Price (KSh)</Label>
                              <Input type="number" min="0" step="0.01" placeholder={form.price || "Default"} value={row.price} onChange={(e) => updateVariantRow(idx, "price", e.target.value)} />
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground -mt-1">Leave Original Price empty for no discount. Current Price falls back to the product price if blank.</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Stock</Label>
                              <Input type="number" min="0" value={row.stock} onChange={(e) => updateVariantRow(idx, "stock", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">SKU</Label>
                              <Input placeholder="Optional" value={row.sku} onChange={(e) => updateVariantRow(idx, "sku", e.target.value)} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Images</Label>
                            <div className="flex flex-wrap gap-2">
                              {row.existingImageUrls.map((url, imgIdx) => (
                                <div key={`ex-${imgIdx}`} className="relative w-12 h-12 rounded overflow-hidden border border-border bg-secondary group">
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => removeVariantImage(idx, imgIdx, true)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2.5 w-2.5" /></button>
                                </div>
                              ))}
                              {row.imagePreviews.map((preview, imgIdx) => (
                                <div key={`new-${imgIdx}`} className="relative w-12 h-12 rounded overflow-hidden border border-border bg-secondary group">
                                  <img src={preview} alt="" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => removeVariantImage(idx, row.existingImageUrls.length + imgIdx, false)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2.5 w-2.5" /></button>
                                </div>
                              ))}
                              <button type="button" onClick={() => variantFileRefs.current[idx]?.click()} className="h-12 w-12 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"><ImageIcon className="h-4 w-4" /></button>
                              <input ref={(el) => { variantFileRefs.current[idx] = el; }} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleVariantImageSelect(idx, e)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!hasVariants && <p className="text-sm text-muted-foreground">No variations needed? You can skip this step.</p>}
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review & Save</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{categoryPath.join(" > ") || "—"}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Product Name</span><span className="font-medium">{form.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Condition</span><span className="font-medium capitalize">{form.condition}</span></div>
              {keyFeatures.filter(f => f.trim()).length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Key Features</span><span className="font-medium">{keyFeatures.filter(f => f.trim()).length} listed</span></div>}
              {whatsInBoxItems.filter(s => s.trim()).length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">What's in the Box</span><span className="font-medium">{whatsInBoxItems.filter(s => s.trim()).length} items</span></div>}
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">KSh {form.price || "—"}</span></div>
              {form.compareAtPrice && <div className="flex justify-between"><span className="text-muted-foreground">Compare at Price</span><span className="font-medium">KSh {form.compareAtPrice}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span className="font-medium">{hasVariants ? variantRows.reduce((s, v) => s + (parseInt(v.stock) || 0), 0) : form.stock}</span></div>
              {form.sku && <div className="flex justify-between"><span className="text-muted-foreground">SKU</span><span className="font-medium">{form.sku}</span></div>}
              {images.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Images</span><span className="font-medium">{images.length} uploaded</span></div>}
              {hasVariants && <div className="flex justify-between"><span className="text-muted-foreground">Variants</span><span className="font-medium">{variantRows.length} combinations</span></div>}
              <Separator />

              <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Seller Info</h4>
                <div className="flex justify-between"><span className="text-muted-foreground">Seller Name</span><span className="font-medium">{vendor?.store_name || "—"}</span></div>
                {vendor?.phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone #1</span><span className="font-medium">{vendor.phone}</span></div>}
                {vendor?.phone2 && <div className="flex justify-between"><span className="text-muted-foreground">Phone #2</span><span className="font-medium">{vendor.phone2}</span></div>}
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="w-full h-12 font-bold text-base bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {/* Navigation */}
        {step < 5 && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            {step > 0 && <Button type="button" variant="outline" className="flex-1" onClick={back}>Back</Button>}
            <Button type="button" className="flex-1" onClick={next}>
              {step === 4 ? "Review" : "Next"}
            </Button>
          </div>
        )}
        {step === 5 && (
          <div className="mt-4">
            <Button type="button" variant="outline" className="w-full" onClick={back}>Back</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProductPage;
