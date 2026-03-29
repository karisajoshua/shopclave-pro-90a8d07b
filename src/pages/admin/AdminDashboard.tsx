import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, ShoppingBag, Store, DollarSign, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const { user } = useAuth();

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const pendingVendors = vendors?.filter((v: any) => v.status === "pending") || [];
  const totalRevenue = allOrders?.reduce((sum, o: any) => sum + Number(o.total), 0) || 0;

  const stats = [
    { label: "Total Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
    { label: "Vendors", value: vendors?.length || 0, icon: Store, color: "text-primary" },
    { label: "Products", value: allProducts?.length || 0, icon: Package, color: "text-warning" },
    { label: "Pending Approvals", value: pendingVendors.length, icon: Users, color: "text-destructive" },
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

      {/* Recent orders */}
      <div>
        <h3 className="font-semibold mb-3">Recent Orders</h3>
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-medium">Order ID</th>
                <th className="text-left p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {allOrders?.slice(0, 10).map((o: any) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="p-3 font-medium">KSh {Number(o.total).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      o.status === "delivered" ? "bg-success/10 text-success" :
                      o.status === "shipped" ? "bg-primary/10 text-primary" :
                      "bg-warning/10 text-warning"
                    }`}>{o.status}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
