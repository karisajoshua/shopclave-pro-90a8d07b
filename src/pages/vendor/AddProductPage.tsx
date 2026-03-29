import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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
import { Plus, X, Layers } from "lucide-react";

interface OptionType {
  name: string;
  values: string[];
}

interface VariantRow {
  options: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
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

const AddProductPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vendor } = useOutletContext<{ vendor: any }>();
  const [loading, setLoading] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([{ name: "", values: [] }]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    categoryId: "",
    status: "active",
    imageUrl: "",
  });

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, parent_id").order("name");
      return data || [];
    },
  });

  const categoryOptions = (() => {
    if (!categories) return [];
    const topLevel = categories.filter((c: any) => !c.parent_id);
    const result: { id: string; label: string }[] = [];
    topLevel.forEach((top: any) => {
      result.push({ id: top.id, label: top.name });
      const children = categories.filter((c: any) => c.parent_id === top.id);
      children.forEach((child: any) => {
        result.push({ id: child.id, label: `  └ ${child.name}` });
        const grandchildren = categories.filter((c: any) => c.parent_id === child.id);
        grandchildren.forEach((gc: any) => {
          result.push({ id: gc.id, label: `    └ ${gc.name}` });
        });
      });
    });
    return result;
  })();

  const regenerateVariants = (opts: OptionType[]) => {
    const combos = generateCombinations(opts);
    setVariantRows(combos.map(options => ({
      options,
      price: "",
      stock: "0",
      sku: "",
    })));
  };

  const addOptionType = () => {
    setOptionTypes([...optionTypes, { name: "", values: [] }]);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) { toast.error("Vendor account not found"); return; }
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required"); return; }

    if (hasVariants && variantRows.length === 0) {
      toast.error("Please add at least one variant option with values");
      return;
    }

    setLoading(true);
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
      const { data: product, error } = await supabase.from("products").insert({
        vendor_id: vendor.id,
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        compare_at_price: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        stock: hasVariants ? variantRows.reduce((s, v) => s + (parseInt(v.stock) || 0), 0) : parseInt(form.stock) || 0,
        category_id: form.categoryId || null,
        status: form.status,
      }).select().single();
      if (error) throw error;

      if (form.imageUrl.trim() && product) {
        await supabase.from("product_images").insert({
          product_id: product.id,
          url: form.imageUrl.trim(),
          position: 0,
        });
      }

      if (hasVariants && variantRows.length > 0 && product) {
        const variants = variantRows.map(v => ({
          product_id: product.id,
          variant_options: v.options,
          price: v.price ? parseFloat(v.price) : null,
          stock: parseInt(v.stock) || 0,
          sku: v.sku.trim() || null,
        }));
        const { error: vErr } = await supabase.from("product_variants").insert(variants);
        if (vErr) throw vErr;
      }

      toast.success("Product added!");
      navigate("/vendor/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-6">Add New Product</h2>
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

        <div>
          <Label>Image URL</Label>
          <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/image.jpg" />
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
              <p className="text-sm text-muted-foreground">Define option types (e.g. Size, Color) and their values. Variant rows are auto-generated.</p>

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
                  <Label className="text-sm font-medium mb-2 block">
                    Variant Combinations ({variantRows.length})
                  </Label>
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary">
                          <tr>
                            <th className="text-left p-2.5 font-medium">Variant</th>
                            <th className="text-left p-2.5 font-medium">Price Override</th>
                            <th className="text-left p-2.5 font-medium">Stock</th>
                            <th className="text-left p-2.5 font-medium">SKU</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantRows.map((row, idx) => (
                            <tr key={idx} className="border-t border-border">
                              <td className="p-2.5">
                                <span className="text-xs font-medium">
                                  {Object.entries(row.options).map(([k, v]) => `${k}: ${v}`).join(" / ")}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={form.price || "Default"}
                                  value={row.price}
                                  onChange={(e) => updateVariantRow(idx, "price", e.target.value)}
                                  className="h-8 w-24 text-xs"
                                />
                              </td>
                              <td className="p-2.5">
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.stock}
                                  onChange={(e) => updateVariantRow(idx, "stock", e.target.value)}
                                  className="h-8 w-20 text-xs"
                                />
                              </td>
                              <td className="p-2.5">
                                <Input
                                  placeholder="Optional"
                                  value={row.sku}
                                  onChange={(e) => updateVariantRow(idx, "sku", e.target.value)}
                                  className="h-8 w-24 text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/vendor/products")}>Cancel</Button>
          <Button type="submit" className="flex-1 font-semibold" disabled={loading}>
            {loading ? "Adding..." : "Add Product"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddProductPage;
