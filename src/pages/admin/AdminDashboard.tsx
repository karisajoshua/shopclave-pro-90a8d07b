import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, ShoppingBag, Store, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { subDays, subMonths, startOfDay, format, isAfter } from "date-fns";

type TimeFrame = "24h" | "7d" | "30d" | "12m" | "all";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("30d");

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allOrders } = useQuery({
    queryKey: ["admin-all-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allOrderItems } = useQuery({
    queryKey: ["admin-all-order-items"],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*, products(name, slug), vendors(store_name)");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["admin-withdrawals-dash"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("withdrawal_requests").select("*").eq("status", "completed");
      return data || [];
    },
    enabled: !!user,
  });

  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (timeFrame === "24h") return subDays(now, 1);
    if (timeFrame === "7d") return subDays(now, 7);
    if (timeFrame === "30d") return subDays(now, 30);
    if (timeFrame === "12m") return subMonths(now, 12);
    return new Date(0);
  }, [timeFrame]);

  const filteredOrders = useMemo(
    () => allOrders?.filter((o: any) => isAfter(new Date(o.created_at), cutoffDate)) || [],
    [allOrders, cutoffDate]
  );

  const filteredItems = useMemo(
    () => allOrderItems?.filter((i: any) => isAfter(new Date(i.created_at), cutoffDate)) || [],
    [allOrderItems, cutoffDate]
  );

  const totalRevenue = filteredOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const totalCommission = filteredItems.reduce((s: number, i: any) => s + Number(i.commission_amount), 0);
  const totalPayouts = withdrawals?.reduce((s: number, w: any) => s + Number(w.amount), 0) || 0;

  // Chart data
  const chartData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const fmt = timeFrame === "24h" ? "HH:00" : timeFrame === "12m" ? "MMM yyyy" : "MMM dd";
    filteredOrders.forEach((o: any) => {
      const key = format(new Date(o.created_at), fmt);
      buckets[key] = (buckets[key] || 0) + Number(o.total);
    });
    return Object.entries(buckets).map(([name, revenue]) => ({ name, revenue }));
  }, [filteredOrders, timeFrame]);

  // Top vendors
  const topVendors = useMemo(() => {
    const map: Record<string, { name: string; sales: number; commission: number; orders: number }> = {};
    filteredItems.forEach((i: any) => {
      const vid = i.vendor_id;
      if (!vid) return;
      if (!map[vid]) map[vid] = { name: (i.vendors as any)?.store_name || "Unknown", sales: 0, commission: 0, orders: 0 };
      map[vid].sales += Number(i.price) * i.quantity;
      map[vid].commission += Number(i.commission_amount);
      map[vid].orders += 1;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales).slice(0, 10);
  }, [filteredItems]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; vendor: string; units: number; revenue: number }> = {};
    filteredItems.forEach((i: any) => {
      const pid = i.product_id;
      if (!pid) return;
      if (!map[pid]) map[pid] = { name: (i.products as any)?.name || "Unknown", vendor: (i.vendors as any)?.store_name || "—", units: 0, revenue: 0 };
      map[pid].units += i.quantity;
      map[pid].revenue += Number(i.price) * i.quantity;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredItems]);

  const stats = [
    { label: "Total Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
    { label: "Platform Earnings", value: `KSh ${totalCommission.toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
    { label: "Vendor Payouts", value: `KSh ${totalPayouts.toLocaleString()}`, icon: DollarSign, color: "text-warning" },
    { label: "Vendors", value: vendors?.length || 0, icon: Store, color: "text-primary" },
    { label: "Products", value: allProducts?.length || 0, icon: Package, color: "text-warning" },
    { label: "Orders", value: filteredOrders.length, icon: ShoppingBag, color: "text-destructive" },
  ];

  const timeFrames: { label: string; value: TimeFrame }[] = [
    { label: "24h", value: "24h" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "12 Months", value: "12m" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Dashboard Overview</h2>
        <div className="flex gap-1 flex-wrap">
          {timeFrames.map((tf) => (
            <Button key={tf.value} size="sm" variant={timeFrame === tf.value ? "default" : "outline"} onClick={() => setTimeFrame(tf.value)}>
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-lg font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-semibold mb-4">Revenue Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [`KSh ${value.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Vendors */}
      <div>
        <h3 className="font-semibold mb-3">Top Performing Vendors</h3>
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-medium">#</th>
                <th className="text-left p-3 font-medium">Vendor</th>
                <th className="text-left p-3 font-medium">Total Sales</th>
                <th className="text-left p-3 font-medium">Commission</th>
                <th className="text-left p-3 font-medium">Orders</th>
              </tr>
            </thead>
            <tbody>
              {topVendors.map((v, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-medium">{v.name}</td>
                  <td className="p-3">KSh {v.sales.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">KSh {v.commission.toLocaleString()}</td>
                  <td className="p-3">{v.orders}</td>
                </tr>
              ))}
              {topVendors.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div>
        <h3 className="font-semibold mb-3">Top Performing Products</h3>
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-medium">#</th>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-left p-3 font-medium">Vendor</th>
                <th className="text-left p-3 font-medium">Units Sold</th>
                <th className="text-left p-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.vendor}</td>
                  <td className="p-3">{p.units}</td>
                  <td className="p-3">KSh {p.revenue.toLocaleString()}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
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
              {filteredOrders.slice(0, 10).map((o: any) => (
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
