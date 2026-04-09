import { useState, useRef, useEffect } from "react";
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
import { Plus, X, Layers, Upload, Trash2, Video, ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OptionType {
  name: string;
  values: string[];
}

interface VariantRow {
  id?: string;
  options: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  imageFiles: File[];
  imagePreviews: string[];
  existingImageUrls: string[];
}

interface ImageFile {
  file?: File;
  url: string;
  preview: string;
  dbId?: string;
}

function generateCombinations(optionTypes: OptionType[]): Record<string, string>[] {
  if (optionTypes.length === 0) return [];
  const filtered = optionTypes.filter(o => o.name && o.values.length > 0);
  if (filtered.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const opt of filtered) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const val of opt.values) {
        next.push({ ...combo, [opt.name]: val });
      }
    }
    combos = next;
  }
  return combos;
}

const EditProductPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: productId } = useParams<{ id: string }>();
  const { vendor } = useOutletContext<{ vendor: any }>();
  const [loading, setLoading] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([{ name: "", values: [] }]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const [images, setImages] = useState<ImageFile[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    categoryId: "",
    status: "active",
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

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, parent_id").order("name");
      return data || [];
    },
  });

  // Populate form when product loads
  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      compareAtPrice: product.compare_at_price ? String(product.compare_at_price) : "",
      stock: String(product.stock),
      categoryId: product.category_id || "",
      status: product.status,
    });
    setVideoUrl(product.video_url || "");

    // Load existing product-level images (no variant_id)
    const existingImages: ImageFile[] = (product.product_images || [])
      .filter((img: any) => !img.variant_id)
      .sort((a: any, b: any) => a.position - b.position)
      .map((img: any) => ({ url: img.url, preview: img.url, dbId: img.id }));
    setImages(existingImages);

    // Load existing variants
    const existingVariants = product.product_variants || [];
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
      
      // Get variant images from product_images
      const allProductImages = product.product_images || [];
      setVariantRows(existingVariants.map((v: any) => {
        const variantImgs = allProductImages
          .filter((img: any) => img.variant_id === v.id)
          .sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => img.url);
        return {
          id: v.id,
          options: v.variant_options as Record<string, string>,
          price: v.price ? String(v.price) : "",
          stock: String(v.stock),
          sku: v.sku || "",
          imageFiles: [],
          imagePreviews: [],
          existingImageUrls: variantImgs.length > 0 ? variantImgs : (v.image_url ? [v.image_url] : []),
        };
      }));
    }
  }, [product]);

  const categoryOptions = (() => {
    if (!categories) return [];
    const buildTree = (parentId: string | null, depth: number): { id: string; label: string }[] => {
      const children = categories.filter((c: any) => c.parent_id === parentId);
      const result: { id: string; label: string }[] = [];
      for (const child of children) {
        const prefix = depth > 0 ? '  '.repeat(depth) + '└ ' : '';
        result.push({ id: child.id, label: prefix + child.name });
        result.push(...buildTree(child.id, depth + 1));
      }
      return result;
    };
    return buildTree(null, 0);
  })();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ImageFile[] = files.map(file => ({
      file,
      url: "",
      preview: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadImages = async (prodId: string): Promise<{ url: string; dbId?: string }[]> => {
    const uploadPromises = images.map(async (img) => {
      if (img.file) {
        const ext = img.file.name.split(".").pop();
        const path = `${prodId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, img.file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        return { url: urlData.publicUrl };
      } else if (img.url) {
        return { url: img.url, dbId: img.dbId };
      }
      return null;
    });
    const results = await Promise.all(uploadPromises);
    return results.filter((r): r is { url: string; dbId?: string } => !!r);
  };

  const uploadVariantImages = async (files: File[], prodId: string): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const ext = file.name.split(".").pop();
      const path = `${prodId}/variant-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      return urlData.publicUrl;
    });
    return Promise.all(uploadPromises);
  };

  const regenerateVariants = (opts: OptionType[]) => {
    const combos = generateCombinations(opts);
    setVariantRows(prev => {
      return combos.map(options => {
        const key = JSON.stringify(options);
        const existing = prev.find(r => JSON.stringify(r.options) === key);
        return existing || { options, price: "", stock: "0", sku: "", imageFiles: [], imagePreviews: [], existingImageUrls: [] };
      });
    });
  };

  const addOptionType = () => setOptionTypes([...optionTypes, { name: "", values: [] }]);

  const removeOptionType = (idx: number) => {
    const next = optionTypes.filter((_, i) => i !== idx);
    setOptionTypes(next);
    regenerateVariants(next);
  };

  const updateOptionName = (idx: number, name: string) => {
    const next = [...optionTypes];
    next[idx] = { ...next[idx], name };
    setOptionTypes(next);
    regenerateVariants(next);
  };

  const addOptionValue = (idx: number) => {
    const val = (newValueInputs[idx] || "").trim();
    if (!val) return;
    const next = [...optionTypes];
    if (next[idx].values.includes(val)) return;
    next[idx] = { ...next[idx], values: [...next[idx].values, val] };
    setOptionTypes(next);
    setNewValueInputs({ ...newValueInputs, [idx]: "" });
    regenerateVariants(next);
  };

  const removeOptionValue = (optIdx: number, valIdx: number) => {
    const next = [...optionTypes];
    next[optIdx] = { ...next[optIdx], values: next[optIdx].values.filter((_, i) => i !== valIdx) };
    setOptionTypes(next);
    regenerateVariants(next);
  };

  const updateVariantRow = (idx: number, field: keyof VariantRow, value: string) => {
    const next = [...variantRows];
    next[idx] = { ...next[idx], [field]: value };
    setVariantRows(next);
  };

  const handleVariantImageSelect = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [...variantRows];
    const newFiles = [...next[idx].imageFiles, ...files];
    const newPreviews = [...next[idx].imagePreviews, ...files.map(f => URL.createObjectURL(f))];
    next[idx] = { ...next[idx], imageFiles: newFiles, imagePreviews: newPreviews };
    setVariantRows(next);
    if (variantFileRefs.current[idx]) variantFileRefs.current[idx]!.value = "";
  };

  const removeVariantImage = (variantIdx: number, imgIdx: number, isExisting: boolean) => {
    const next = [...variantRows];
    if (isExisting) {
      next[variantIdx] = {
        ...next[variantIdx],
        existingImageUrls: next[variantIdx].existingImageUrls.filter((_, i) => i !== imgIdx),
      };
    } else {
      const adjustedIdx = imgIdx - next[variantIdx].existingImageUrls.length;
      next[variantIdx] = {
        ...next[variantIdx],
        imageFiles: next[variantIdx].imageFiles.filter((_, i) => i !== adjustedIdx),
        imagePreviews: next[variantIdx].imagePreviews.filter((_, i) => i !== adjustedIdx),
      };
    }
    setVariantRows(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !productId) return;
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required"); return; }

    setLoading(true);
    try {
      // Update product
      const { error } = await supabase.from("products").update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        compare_at_price: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        stock: hasVariants ? variantRows.reduce((s, v) => s + (parseInt(v.stock) || 0), 0) : parseInt(form.stock) || 0,
        category_id: form.categoryId || null,
        status: form.status,
        video_url: videoUrl.trim() || null,
      }).eq("id", productId);
      if (error) throw error;

      // Handle product-level images: delete old, insert new
      const uploadedImages = await uploadImages(productId);
      // Delete all old product_images rows (they'll be re-created)
      await supabase.from("product_images").delete().eq("product_id", productId);
      if (uploadedImages.length > 0) {
        const imageRows = uploadedImages.map((img, idx) => ({
          product_id: productId,
          url: img.url,
          position: idx,
        }));
        const { error: imgErr } = await supabase.from("product_images").insert(imageRows);
        if (imgErr) throw imgErr;
      }

      // Handle variants: delete old, insert new
      await supabase.from("product_variants").delete().eq("product_id", productId);
      if (hasVariants && variantRows.length > 0) {
        await Promise.all(variantRows.map(async (v) => {
          const newUrls = v.imageFiles.length > 0 ? await uploadVariantImages(v.imageFiles, productId) : [];
          const allUrls = [...v.existingImageUrls, ...newUrls];
          const firstImgUrl = allUrls[0] || null;

          const { data: variant, error: vErr } = await supabase.from("product_variants").insert({
            product_id: productId,
            variant_options: v.options,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock) || 0,
            sku: v.sku.trim() || null,
            image_url: firstImgUrl,
          }).select("id").single();
          if (vErr) throw vErr;

          if (allUrls.length > 0 && variant) {
            const variantImageRows = allUrls.map((url, idx) => ({
              product_id: productId,
              variant_id: variant.id,
              url,
              position: idx,
            }));
            await supabase.from("product_images").insert(variantImageRows);
          }
        }));
      }

      toast.success("Product updated!");
      navigate("/vendor/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (productLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-12 text-muted-foreground">Product not found</div>;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-6">Edit Product</h2>
      <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div>
          <Label>Product Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Price (KSh) *</Label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <div>
            <Label>Compare at Price</Label>
            <Input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
          </div>
        </div>

        {!hasVariants && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Stock Quantity</Label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
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
          </div>
        )}

        {hasVariants && (
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
        )}

        {/* Multi-Image Upload */}
        <div className="border-t border-border pt-4">
          <Label className="text-base font-semibold mb-3 block">Product Images</Label>
          <div className="flex flex-wrap gap-3 mb-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-secondary group">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-0.5 left-0.5 bg-background/80 text-[10px] px-1 rounded font-medium">{idx + 1}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">Upload</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Video URL */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Video className="h-4 w-4 text-muted-foreground" />
            <Label>Video URL (YouTube or Vimeo)</Label>
          </div>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>

        {/* Variants Section */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Product Variations</Label>
            </div>
            <Switch checked={hasVariants} onCheckedChange={setHasVariants} />
          </div>

          {hasVariants && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Define option types (e.g. Size, Color) and their values.</p>

              {optionTypes.map((opt, optIdx) => (
                <div key={optIdx} className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Option name (e.g. Size, Color)"
                      value={opt.name}
                      onChange={(e) => updateOptionName(optIdx, e.target.value)}
                      className="flex-1"
                    />
                    {optionTypes.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeOptionType(optIdx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {opt.values.map((val, valIdx) => (
                      <span key={valIdx} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                        {val}
                        <button type="button" onClick={() => removeOptionValue(optIdx, valIdx)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add value (e.g. S, M, L)"
                      value={newValueInputs[optIdx] || ""}
                      onChange={(e) => setNewValueInputs({ ...newValueInputs, [optIdx]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOptionValue(optIdx); } }}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => addOptionValue(optIdx)}>Add</Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addOptionType}>
                <Plus className="h-3.5 w-3.5" /> Add Option Type
              </Button>

              {variantRows.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">Variant Combinations ({variantRows.length})</Label>
                  <div className="space-y-3">
                    {variantRows.map((row, idx) => (
                      <div key={idx} className="bg-card border border-border rounded-lg p-3 space-y-3">
                        <p className="text-xs font-semibold text-foreground">
                          {Object.entries(row.options).map(([k, v]) => `${k}: ${v}`).join(" / ")}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Price</Label>
                            <Input type="number" min="0" step="0.01" placeholder={form.price || "Default"} value={row.price} onChange={(e) => updateVariantRow(idx, "price", e.target.value)} className="h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Stock</Label>
                            <Input type="number" min="0" value={row.stock} onChange={(e) => updateVariantRow(idx, "stock", e.target.value)} className="h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">SKU</Label>
                            <Input placeholder="Optional" value={row.sku} onChange={(e) => updateVariantRow(idx, "sku", e.target.value)} className="h-8 text-xs" />
                          </div>
                        </div>
                        {/* Variant Images */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-1 block">Images</Label>
                          <div className="flex flex-wrap gap-2">
                            {row.existingImageUrls.map((url, imgIdx) => (
                              <div key={`existing-${imgIdx}`} className="relative w-12 h-12 rounded overflow-hidden border border-border bg-secondary group">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(idx, imgIdx, true)}
                                  className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                            {row.imagePreviews.map((preview, imgIdx) => (
                              <div key={`new-${imgIdx}`} className="relative w-12 h-12 rounded overflow-hidden border border-border bg-secondary group">
                                <img src={preview} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(idx, row.existingImageUrls.length + imgIdx, false)}
                                  className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => variantFileRefs.current[idx]?.click()}
                              className="h-12 w-12 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                            <input
                              ref={(el) => { variantFileRefs.current[idx] = el; }}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleVariantImageSelect(idx, e)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/vendor/products")}>Cancel</Button>
          <Button type="submit" className="flex-1 font-semibold" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;
