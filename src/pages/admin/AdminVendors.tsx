import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search, Eye, MousePointer, Package } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const AdminVendors = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-detail"],
    queryFn: async () => {
      const { data: vendorData } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (!vendorData || vendorData.length === 0) return [];
      
      const userIds = vendorData.map((v: any) => v.user_id);
      const { data: profileData } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = new Map((profileData || []).map((p: any) => [p.user_id, p.full_name]));

      // Get analytics counts per vendor
      const vendorIds = vendorData.map((v: any) => v.id);
      const { data: analyticsData } = await supabase.from("vendor_analytics").select("vendor_id, event_type").in("vendor_id", vendorIds);
      
      const analyticsMap = new Map<string, { views: number; clicks: number }>();
      (analyticsData || []).forEach((a: any) => {
        const existing = analyticsMap.get(a.vendor_id) || { views: 0, clicks: 0 };
        if (a.event_type === "view") existing.views++;
        else existing.clicks++;
        analyticsMap.set(a.vendor_id, existing);
      });

      // Get product counts
      const { data: productCounts } = await supabase.from("products").select("vendor_id").in("vendor_id", vendorIds).eq("status", "active");
      const productMap = new Map<string, number>();
      (productCounts || []).forEach((p: any) => {
        productMap.set(p.vendor_id, (productMap.get(p.vendor_id) || 0) + 1);
      });

      // Get active subscriptions
      const { data: subs } = await supabase
        .from("vendor_subscriptions")
        .select("vendor_id, plan_name, max_listings, expires_at, created_at")
        .in("vendor_id", vendorIds)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      const subMap = new Map<string, any>();
      (subs || []).forEach((s: any) => {
        if (!subMap.has(s.vendor_id)) subMap.set(s.vendor_id, s);
      });

      return vendorData.map((v: any) => ({
        ...v,
        owner_name: profileMap.get(v.user_id) || "—",
        stats: analyticsMap.get(v.id) || { views: 0, clicks: 0 },
        listing_count: productMap.get(v.id) || 0,
        subscription: subMap.get(v.id) || null,
      }));
    },
    enabled: !!user,
  });

  const updateVendorStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vendors").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors-detail"] });
      toast.success("Vendor status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = vendors?.filter((v: any) =>
    v.store_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-success/10 text-success";
    if (s === "pending") return "bg-warning/10 text-warning";
    return "bg-destructive/10 text-destructive";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <h2 className="text-xl font-bold">Vendor Management</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Store</th>
              <th className="text-left p-3 font-medium">Owner</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-left p-3 font-medium">Listings</th>
              <th className="text-left p-3 font-medium">Views</th>
              <th className="text-left p-3 font-medium">Clicks</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v: any) => (
              <tr key={v.id} className="border-t border-border">
                <td className="p-3 font-medium">{v.store_name}</td>
                <td className="p-3 text-muted-foreground">{v.owner_name}</td>
                <td className="p-3 text-muted-foreground text-xs">{v.phone || "—"}</td>
                <td className="p-3">
                  {v.subscription ? (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium capitalize">{v.subscription.plan_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {v.subscription.max_listings} listings
                        {v.subscription.expires_at && ` · exp ${new Date(v.subscription.expires_at).toLocaleDateString()}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Free (5)</span>
                  )}
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {v.listing_count}</span>
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {v.stats.views}</span>
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" /> {v.stats.clicks}</span>
                </td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(v.status)}`}>{v.status}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {v.status !== "approved" && (
                      <Button size="sm" variant="ghost" className="h-7 text-success" onClick={() => updateVendorStatus.mutate({ id: v.id, status: "approved" })}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {v.status === "approved" && (
                      <Button size="sm" variant="ghost" className="h-7 text-warning" onClick={() => updateVendorStatus.mutate({ id: v.id, status: "suspended" })}>
                        Suspend
                      </Button>
                    )}
                    {v.status !== "rejected" && (
                      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => updateVendorStatus.mutate({ id: v.id, status: "rejected" })}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
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

export default AdminVendors;
