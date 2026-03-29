import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, StarOff, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const AdminProducts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, vendors(store_name), product_images(url)").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = products?.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <h2 className="text-xl font-bold">All Products</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Product</th>
              <th className="text-left p-3 font-medium">Vendor</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">Stock</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <img src={p.product_images?.[0]?.url || "/placeholder.svg"} alt="" className="w-8 h-8 rounded object-cover bg-secondary" />
                    <span className="font-medium line-clamp-1">{p.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{p.vendors?.store_name || "—"}</td>
                <td className="p-3">KSh {Number(p.price).toLocaleString()}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{p.status}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7" title={p.featured ? "Unfeature" : "Feature"}
                      onClick={() => updateProduct.mutate({ id: p.id, updates: { featured: !p.featured } })}>
                      {p.featured ? <Star className="h-4 w-4 text-warning fill-warning" /> : <StarOff className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" title={p.status === "active" ? "Deactivate" : "Activate"}
                      onClick={() => updateProduct.mutate({ id: p.id, updates: { status: p.status === "active" ? "draft" : "active" } })}>
                      {p.status === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;
