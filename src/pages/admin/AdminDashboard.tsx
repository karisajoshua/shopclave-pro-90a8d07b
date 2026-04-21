import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SiteAnalytics from "@/components/admin/SiteAnalytics";
import AdminStatCard from "@/components/admin/AdminStatCard";
import ActionRequiredPanel from "@/components/admin/ActionRequiredPanel";
import QuickNavGrid from "@/components/admin/QuickNavGrid";
import RecentActivityFeed from "@/components/admin/RecentActivityFeed";
import { Users, Package, ShoppingBag, Store, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { subDays, subMonths, format, isAfter } from "date-fns";

type TimeFrame = "24h" | "7d" | "30d" | "12m" | "all";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("30d");

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => (await supabase.from("vendors").select("*")).data || [],
    enabled: !!user,
  });

  const { data: allOrders } = useQuery({
    queryKey: ["admin-all-orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data || [],
    enabled: !!user,
  });

  const { data: allOrderItems } = useQuery({
    queryKey: ["admin-all-order-items"],
    queryFn: async () => (await supabase.from("order_items").select("*, products(name, slug), vendors(store_name)")).data || [],
    enabled: !!user,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => (await supabase.from("products").select("*")).data || [],
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["admin-withdrawals-dash"],
    queryFn: async () => (await (supabase as any).from("withdrawal_requests").select("*").eq("status", "completed")).data || [],
    enabled: !!user,
  });

  const { data: riskFlags } = useQuery({
    queryKey: ["admin-risk-flags-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("user_risk_flags")
        .select("id", { count: "exact", head: true });
      return count || 0;
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
    [allOrders, cutoffDate],
  );

  const filteredItems = useMemo(
    () => allOrderItems?.filter((i: any) => isAfter(new Date(i.created_at), cutoffDate)) || [],
    [allOrderItems, cutoffDate],
  );

  const totalRevenue = filteredOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const totalCommission = filteredItems.reduce((s: number, i: any) => s + Number(i.commission_amount), 0);
  const totalPayouts = withdrawals?.reduce((s: number, w: any) => s + Number(w.amount), 0) || 0;

  // Today vs yesterday delta for revenue & orders
  const { todayRevenue, yesterdayRevenue, todayOrders, yesterdayOrders } = useMemo(() => {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const startYday = new Date(startToday); startYday.setDate(startYday.getDate() - 1);
    let tR = 0, yR = 0, tO = 0, yO = 0;
    (allOrders || []).forEach((o: any) => {
      const d = new Date(o.created_at);
      if (d >= startToday) { tR += Number(o.total); tO += 1; }
      else if (d >= startYday && d < startToday) { yR += Number(o.total); yO += 1; }
    });
    return { todayRevenue: tR, yesterdayRevenue: yR, todayOrders: tO, yesterdayOrders: yO };
  }, [allOrders]);

  const pct = (curr: number, prev: number) => {
    if (!prev && !curr) return 0;
    if (!prev) return 100;
    return ((curr - prev) / prev) * 100;
  };

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

  const timeFrames: { label: string; value: TimeFrame }[] = [
    { label: "24h", value: "24h" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "12 Months", value: "12m" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto stagger-children">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational overview of marketplace activity and platform health.
          </p>
        </div>
        {!!riskFlags && riskFlags > 0 && (
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-3 py-1.5 text-xs font-medium text-admin-danger hover:bg-admin-danger/15 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {riskFlags} risk flag{riskFlags === 1 ? "" : "s"} active
          </Link>
        )}
      </div>

      {/* Action Required */}
      <ActionRequiredPanel />

      {/* Quick Nav */}
      <QuickNavGrid />

      {/* Time-frame selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Performance</h2>
          <p className="text-sm text-muted-foreground">Showing data for the selected window</p>
        </div>
        <div className="flex gap-1 flex-wrap rounded-lg bg-muted p-1">
          {timeFrames.map((tf) => (
            <Button
              key={tf.value}
              size="sm"
              variant={timeFrame === tf.value ? "default" : "ghost"}
              className={timeFrame === tf.value ? "h-7 px-3" : "h-7 px-3 text-muted-foreground hover:bg-card"}
              onClick={() => setTimeFrame(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminStatCard
          label="Revenue"
          value={`KSh ${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          tone="revenue"
          delta={{ value: pct(todayRevenue, yesterdayRevenue), label: "vs yesterday" }}
        />
        <AdminStatCard
          label="Platform earnings"
          value={`KSh ${totalCommission.toLocaleString()}`}
          icon={TrendingUp}
          tone="info"
          hint={`${(((totalCommission / Math.max(totalRevenue, 1)) * 100) || 0).toFixed(1)}% of revenue`}
        />
        <AdminStatCard
          label="Vendor payouts"
          value={`KSh ${totalPayouts.toLocaleString()}`}
          icon={DollarSign}
          tone="warning"
        />
        <AdminStatCard
          label="Vendors"
          value={vendors?.length || 0}
          icon={Store}
          tone="vendors"
        />
        <AdminStatCard
          label="Products"
          value={allProducts?.length || 0}
          icon={Package}
          tone="orders"
        />
        <AdminStatCard
          label="Orders"
          value={filteredOrders.length}
          icon={ShoppingBag}
          tone="danger"
          delta={{ value: pct(todayOrders, yesterdayOrders), label: "vs yesterday" }}
        />
      </div>

      {/* Revenue Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-admin-card shadow-admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Revenue over time</h3>
            <span className="text-[11px] text-muted-foreground">{chartData.length} buckets</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--admin-card))" }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--admin-accent-revenue))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <RecentActivityFeed />
      </div>

      {/* Site Analytics block */}
      <div className="rounded-xl border border-border bg-admin-card shadow-admin-card p-5">
        <SiteAnalytics />
      </div>

      {/* Top Vendors */}
      <section>
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Top performing vendors</h3>
        <div className="rounded-xl border border-border bg-admin-card shadow-admin-card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total sales</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Commission</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Orders</th>
              </tr>
            </thead>
            <tbody>
              {topVendors.map((v, idx) => (
                <tr key={idx} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-medium">{v.name}</td>
                  <td className="p-3">KSh {v.sales.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">KSh {v.commission.toLocaleString()}</td>
                  <td className="p-3">{v.orders}</td>
                </tr>
              ))}
              {topVendors.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No vendor sales yet in this window</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Products */}
      <section>
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Top performing products</h3>
        <div className="rounded-xl border border-border bg-admin-card shadow-admin-card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendor</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Units sold</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, idx) => (
                <tr key={idx} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.vendor}</td>
                  <td className="p-3">{p.units}</td>
                  <td className="p-3">KSh {p.revenue.toLocaleString()}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No product sales yet in this window</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Orders */}
      <section>
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Recent orders</h3>
        <div className="rounded-xl border border-border bg-admin-card shadow-admin-card overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Order ID</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 10).map((o: any) => (
                <tr key={o.id} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="p-3 font-medium">KSh {Number(o.total).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      o.status === "delivered" ? "bg-success/10 text-success" :
                      o.status === "shipped" ? "bg-admin-info/10 text-admin-info" :
                      "bg-warning/10 text-warning"
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">No orders in this window</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
