import { useState } from "react";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, DollarSign, ShoppingBag, TrendingUp, Settings, BarChart3, Truck, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VendorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) { navigate("/auth"); return null; }

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("user_id", user.id).single();
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];
      const { data } = await supabase.from("products").select("*, product_images(url)").eq("vendor_id", vendor.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendor,
  });

  const { data: orderItems } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];
      const { data } = await supabase.from("order_items").select("*, orders(status, created_at, shipping_address, user_id, total), products(name)").eq("vendor_id", vendor.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendor,
  });

  // Mutations
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-products"] }); toast.success("Product deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleProductStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("products").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-products"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateOrderItemStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("order_items").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-orders"] }); toast.success("Order status updated"); },
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

  if (!vendor) {
    return (
      <MarketplaceLayout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-4">You haven't registered as a vendor yet.</p>
          <Link to="/vendor/register"><Button>Register as Vendor</Button></Link>
        </div>
      </MarketplaceLayout>
    );
  }

  const totalRevenue = orderItems?.reduce((sum, i: any) => sum + Number(i.price) * i.quantity, 0) || 0;
  const totalCommission = orderItems?.reduce((sum, i: any) => sum + Number(i.commission_amount), 0) || 0;
  const netEarnings = totalRevenue - totalCommission;
  const totalOrders = orderItems?.length || 0;
  const totalProducts = products?.length || 0;

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": case "active": case "delivered": return "bg-success/10 text-success";
      case "pending": case "processing": return "bg-warning/10 text-warning";
      case "shipped": return "bg-primary/10 text-primary";
      default: return "bg-destructive/10 text-destructive";
    }
  };

  const orderStatusFlow = ["pending", "processing", "shipped", "delivered"];

  return (
    <MarketplaceLayout>
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">{vendor.store_name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(vendor.status)}`}>
              {vendor.status}
            </span>
          </div>
          <Link to="/vendor/products/new">
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Product</Button>
          </Link>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Products</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5"><Truck className="h-3.5 w-3.5" /> Orders</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Earnings</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
          </TabsList>

          {/* ─── Overview ─── */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
                { label: "Orders", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
                { label: "Products", value: totalProducts, icon: Package, color: "text-warning" },
                { label: "Net Earnings", value: `KSh ${netEarnings.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            {orderItems && orderItems.length > 0 && (
              <>
                <h2 className="font-semibold text-lg mb-4">Recent Orders</h2>
                <div className="bg-card rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left p-3 font-medium">Product</th>
                        <th className="text-left p-3 font-medium">Qty</th>
                        <th className="text-left p-3 font-medium">Total</th>
                        <th className="text-left p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.slice(0, 5).map((item: any) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="p-3 font-medium">{(item.products as any)?.name || "—"}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3">KSh {(Number(item.price) * item.quantity).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(item.status)}`}>{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── Products ─── */}
          <TabsContent value="products">
            {products?.length ? (
              <>
                {/* Desktop table */}
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
                        <ProductRow
                          key={p.id}
                          product={p}
                          statusColor={statusColor}
                          onToggleStatus={(id, s) => toggleProductStatus.mutate({ id, status: s })}
                          onDelete={(id) => deleteProduct.mutate(id)}
                          onUpdateStock={(id, stock) => updateStock.mutate({ id, stock })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {products.map((p: any) => (
                    <div key={p.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={p.product_images?.[0]?.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80"} alt="" className="w-12 h-12 rounded object-cover bg-secondary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{p.name}</p>
                          <p className="text-xs text-muted-foreground">KSh {Number(p.price).toLocaleString()}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Stock: {p.stock}</span>
                        <div className="flex gap-1 ml-auto">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleProductStatus.mutate({ id: p.id, status: p.status === "active" ? "draft" : "active" })}>
                            {p.status === "active" ? "Set Draft" : "Activate"}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteProduct.mutate(p.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No products yet</p>
                <Link to="/vendor/products/new"><Button className="mt-4" size="sm">Add First Product</Button></Link>
              </div>
            )}
          </TabsContent>

          {/* ─── Orders ─── */}
          <TabsContent value="orders">
            {orderItems && orderItems.length > 0 ? (
              <>
                <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left p-3 font-medium">Product</th>
                        <th className="text-left p-3 font-medium">Qty</th>
                        <th className="text-left p-3 font-medium">Total</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item: any) => {
                        const currentIdx = orderStatusFlow.indexOf(item.status);
                        const nextStatus = currentIdx < orderStatusFlow.length - 1 ? orderStatusFlow[currentIdx + 1] : null;
                        return (
                          <tr key={item.id} className="border-t border-border">
                            <td className="p-3 font-medium">{(item.products as any)?.name || "—"}</td>
                            <td className="p-3">{item.quantity}</td>
                            <td className="p-3">KSh {(Number(item.price) * item.quantity).toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(item.status)}`}>{item.status}</span>
                            </td>
                            <td className="p-3">
                              {nextStatus ? (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateOrderItemStatus.mutate({ id: item.id, status: nextStatus })}>
                                  Mark {nextStatus}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Completed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {orderItems.map((item: any) => {
                    const currentIdx = orderStatusFlow.indexOf(item.status);
                    const nextStatus = currentIdx < orderStatusFlow.length - 1 ? orderStatusFlow[currentIdx + 1] : null;
                    return (
                      <div key={item.id} className="bg-card rounded-lg border border-border p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm">{(item.products as any)?.name || "—"}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(item.status)}`}>{item.status}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          <span>KSh {(Number(item.price) * item.quantity).toLocaleString()}</span>
                        </div>
                        {nextStatus && (
                          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => updateOrderItemStatus.mutate({ id: item.id, status: nextStatus })}>
                            Mark as {nextStatus}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            )}
          </TabsContent>

          {/* ─── Earnings ─── */}
          <TabsContent value="earnings">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Gross Revenue</p>
                <p className="text-2xl font-bold text-foreground">KSh {totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Commission ({vendor.commission_rate}%)</p>
                <p className="text-2xl font-bold text-destructive">- KSh {totalCommission.toLocaleString()}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Net Earnings</p>
                <p className="text-2xl font-bold text-success">KSh {netEarnings.toLocaleString()}</p>
              </div>
            </div>
          </TabsContent>

          {/* ─── Store Settings ─── */}
          <TabsContent value="settings">
            <StoreSettingsForm vendor={vendor} />
          </TabsContent>
        </Tabs>
      </div>
    </MarketplaceLayout>
  );
};

/* ─── Product Row (Desktop) ─── */
const ProductRow = ({ product: p, statusColor, onToggleStatus, onDelete, onUpdateStock }: any) => {
  const [editStock, setEditStock] = useState(false);
  const [stockVal, setStockVal] = useState(String(p.stock));

  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <img src={p.product_images?.[0]?.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80"} alt="" className="w-10 h-10 rounded object-cover bg-secondary" />
          <span className="font-medium line-clamp-1">{p.name}</span>
        </div>
      </td>
      <td className="p-3">KSh {Number(p.price).toLocaleString()}</td>
      <td className="p-3">
        {editStock ? (
          <div className="flex items-center gap-1">
            <Input className="w-20 h-7 text-xs" type="number" value={stockVal} onChange={(e) => setStockVal(e.target.value)} />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onUpdateStock(p.id, parseInt(stockVal) || 0); setEditStock(false); }}>Save</Button>
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
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onToggleStatus(p.id, p.status === "active" ? "draft" : "active")}>
            {p.status === "active" ? "Draft" : "Activate"}
          </Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => onDelete(p.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

/* ─── Store Settings Form ─── */
const StoreSettingsForm = ({ vendor }: { vendor: any }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    store_name: vendor.store_name || "",
    store_description: vendor.store_description || "",
    logo_url: vendor.logo_url || "",
    banner_url: vendor.banner_url || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("vendors").update(form).eq("id", vendor.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
      toast.success("Store settings saved!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 max-w-lg space-y-4">
      <div>
        <Label>Store Name</Label>
        <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
      </div>
      <div>
        <Label>Store Description</Label>
        <Textarea value={form.store_description} onChange={(e) => setForm({ ...form, store_description: e.target.value })} rows={3} />
      </div>
      <div>
        <Label>Logo URL</Label>
        <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
      </div>
      <div>
        <Label>Banner URL</Label>
        <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
};

export default VendorDashboard;
