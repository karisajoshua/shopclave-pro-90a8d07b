import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const VendorProducts = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, product_images(url), product_variants(id)").eq("vendor_id", vendor.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendor,
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-products"] }); toast.success("Product deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("products").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-products"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase.from("products").update({ stock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-products"] }); toast.success("Stock updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (s: string) => s === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning";

  if (!products?.length) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No products yet</p>
        <Link to="/vendor/products/new"><Button className="mt-4" size="sm">Add First Product</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Products ({products.length})</h2>
        <Link to="/vendor/products/new"><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Product</Button></Link>
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Product</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">Stock</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => (
              <ProductRow key={p.id} product={p} statusColor={statusColor} onToggle={toggleStatus} onDelete={deleteProduct} onStock={updateStock} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {products.map((p: any) => (
          <div key={p.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <img src={p.product_images?.[0]?.url || "/placeholder.svg"} alt="" className="w-12 h-12 rounded object-cover bg-secondary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{p.name}</p>
                <p className="text-xs text-muted-foreground">KSh {Number(p.price).toLocaleString()} • Stock: {p.stock}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => toggleStatus.mutate({ id: p.id, status: p.status === "active" ? "draft" : "active" })}>
                {p.status === "active" ? "Set Draft" : "Activate"}
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteProduct.mutate(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductRow = ({ product: p, statusColor, onToggle, onDelete, onStock }: any) => {
  const [editStock, setEditStock] = useState(false);
  const [stockVal, setStockVal] = useState(String(p.stock));

  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <img src={p.product_images?.[0]?.url || "/placeholder.svg"} alt="" className="w-8 h-8 rounded object-cover bg-secondary" />
          <div>
            <span className="font-medium line-clamp-1">{p.name}</span>
            {p.product_variants?.length > 0 && (
              <span className="ml-1.5 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{p.product_variants.length} variants</span>
            )}
          </div>
        </div>
      </td>
      <td className="p-3">KSh {Number(p.price).toLocaleString()}</td>
      <td className="p-3">
        {editStock ? (
          <div className="flex items-center gap-1">
            <Input className="w-16 h-7 text-xs" type="number" value={stockVal} onChange={(e) => setStockVal(e.target.value)} />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onStock.mutate({ id: p.id, stock: parseInt(stockVal) || 0 }); setEditStock(false); }}>Save</Button>
          </div>
        ) : (
          <button onClick={() => setEditStock(true)} className="hover:underline">{p.stock}</button>
        )}
      </td>
      <td className="p-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onToggle.mutate({ id: p.id, status: p.status === "active" ? "draft" : "active" })}>
            {p.status === "active" ? "Draft" : "Activate"}
          </Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => onDelete.mutate(p.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default VendorProducts;
