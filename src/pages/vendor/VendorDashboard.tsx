import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";
import { Eye, MousePointer, Package, Users, AlertTriangle } from "lucide-react";

const VendorDashboard = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();

  const { data: products } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("vendor_id", vendor.id);
      return data || [];
    },
    enabled: !!vendor,
  });

  const { data: analytics } = useQuery({
    queryKey: ["vendor-analytics", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_analytics")
        .select("event_type")
        .eq("vendor_id", vendor.id);
      return data || [];
    },
    enabled: !!vendor,
  });

  const { data: subscription } = useQuery({
    queryKey: ["vendor-subscription", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_subscriptions")
        .select("*")
        .eq("vendor_id", vendor.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!vendor,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["vendor-followers", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_vendor_follower_count", { v_id: vendor.id });
      return data || 0;
    },
    enabled: !!vendor,
  });

  const totalViews = analytics?.filter((a: any) => a.event_type === "view").length || 0;
  const totalClicks = analytics?.filter((a: any) => ["call_click", "whatsapp_click", "website_click"].includes(a.event_type)).length || 0;
  const activeListings = products?.filter((p: any) => p.status === "active").length || 0;
  const maxListings = subscription?.max_listings ?? 5;

  const isExpiring = subscription?.expires_at && new Date(subscription.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const stats = [
    { label: "Product Views", value: totalViews, icon: Eye, color: "text-primary" },
    { label: "Contact Clicks", value: totalClicks, icon: MousePointer, color: "text-success" },
    { label: "Active Listings", value: `${activeListings} / ${maxListings}`, icon: Package, color: "text-warning" },
    { label: "Followers", value: followerCount, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Overview</h2>

      {/* Subscription warning */}
      {isExpiring && (
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span>Your subscription expires on {new Date(subscription!.expires_at!).toLocaleDateString()}. Contact admin to renew.</span>
        </div>
      )}

      {/* Subscription info */}
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Plan: <span className="font-semibold text-foreground capitalize">{subscription?.plan_name || "Free"}</span>
          {subscription?.expires_at && (
            <> · Expires: <span className="font-medium">{new Date(subscription.expires_at).toLocaleDateString()}</span></>
          )}
        </p>
      </div>

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

      {/* Top Viewed Products */}
      {products && products.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Your Products</h3>
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 10).map((p: any, idx: number) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">KSh {Number(p.price).toLocaleString()}</td>
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
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
