import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const AddProductPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, parent_id").order("name");
      return data || [];
    },
  });

  if (!user) { navigate("/auth"); return null; }

  // Build a flat list with indented names for subcategories
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) { toast.error("Vendor account not found"); return; }
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required"); return; }

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
        stock: parseInt(form.stock) || 0,
        category_id: form.categoryId || null,
        status: form.status,
      }).select().single();
      if (error) throw error;

      // If image URL provided, insert it
      if (form.imageUrl.trim() && product) {
        await supabase.from("product_images").insert({
          product_id: product.id,
          url: form.imageUrl.trim(),
          position: 0,
        });
      }

      toast.success("Product added!");
      navigate("/vendor/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketplaceLayout>
      <div className="container py-8 max-w-lg">
        <h1 className="font-display text-2xl font-bold mb-6">Add New Product</h1>
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
          <div>
            <Label>Image URL</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/image.jpg" />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/vendor/dashboard")}>Cancel</Button>
            <Button type="submit" className="flex-1 font-semibold" disabled={loading}>
              {loading ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </form>
      </div>
    </MarketplaceLayout>
  );
};

export default AddProductPage;
