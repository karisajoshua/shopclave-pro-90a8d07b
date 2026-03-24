import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, Plus, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const VendorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
      const { data } = await supabase.from("order_items").select("*, orders(status, created_at, shipping_address), products(name)").eq("vendor_id", vendor.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendor,
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
  const totalOrders = orderItems?.length || 0;
  const totalProducts = products?.length || 0;

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-success/10 text-success";
      case "pending": return "bg-warning/10 text-warning";
      default: return "bg-destructive/10 text-destructive";
    }
  };

  return (
    <MarketplaceLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
            { label: "Orders", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
            { label: "Products", value: totalProducts, icon: Package, color: "text-warning" },
            { label: "Commission", value: `${vendor.commission_rate}%`, icon: TrendingUp, color: "text-muted-foreground" },
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

        {/* Products */}
        <h2 className="font-semibold text-lg mb-4">Your Products</h2>
        {products?.length ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Price</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Stock</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.product_images?.[0]?.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80"} alt="" className="w-10 h-10 rounded object-cover bg-secondary" />
                        <span className="font-medium line-clamp-1">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">KSh {Number(p.price).toLocaleString()}</td>
                    <td className="p-3 hidden md:table-cell">{p.stock}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No products yet</p>
            <Link to="/vendor/products/new"><Button className="mt-4" size="sm">Add First Product</Button></Link>
          </div>
        )}

        {/* Recent Orders */}
        {orderItems && orderItems.length > 0 && (
          <>
            <h2 className="font-semibold text-lg mb-4 mt-8">Recent Orders</h2>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-3 font-medium">Product</th>
                    <th className="text-left p-3 font-medium">Qty</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.slice(0, 10).map((item: any) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3 font-medium">{(item.products as any)?.name || "—"}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">KSh {(Number(item.price) * item.quantity).toLocaleString()}</td>
                      <td className="p-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default VendorDashboard;
