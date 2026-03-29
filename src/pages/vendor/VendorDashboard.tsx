import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";
import { DollarSign, ShoppingBag, Package, TrendingUp } from "lucide-react";

const VendorDashboard = () => {
  const { user } = useAuth();
  const { vendor } = useOutletContext<{ vendor: any }>();

  const { data: products } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("vendor_id", vendor.id);
      return data || [];
    },
    enabled: !!vendor,
  });

  const { data: orderItems } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*, orders(status, created_at), products(name)").eq("vendor_id", vendor.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendor,
  });

  const totalRevenue = orderItems?.reduce((sum, i: any) => sum + Number(i.price) * i.quantity, 0) || 0;
  const totalCommission = orderItems?.reduce((sum, i: any) => sum + Number(i.commission_amount), 0) || 0;
  const netEarnings = totalRevenue - totalCommission;

  const stats = [
    { label: "Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
    { label: "Orders", value: orderItems?.length || 0, icon: ShoppingBag, color: "text-primary" },
    { label: "Products", value: products?.length || 0, icon: Package, color: "text-warning" },
    { label: "Net Earnings", value: `KSh ${netEarnings.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
        <div>
          <h3 className="font-semibold mb-3">Recent Orders</h3>
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
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
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === "delivered" ? "bg-success/10 text-success" : item.status === "shipped" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
