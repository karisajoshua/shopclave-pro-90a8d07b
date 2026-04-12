import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const AdminSubscriptions = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSub, setNewSub] = useState({ vendor_id: "", plan_name: "basic", max_listings: 20, price: 1000, expires_days: 30 });

  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data: subs } = await supabase
        .from("vendor_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!subs?.length) return [];

      const vendorIds = [...new Set(subs.map((s: any) => s.vendor_id))];
      const { data: vendors } = await supabase.from("vendors").select("id, store_name").in("id", vendorIds);
      const vendorMap = new Map((vendors || []).map((v: any) => [v.id, v.store_name]));

      return subs.map((s: any) => ({ ...s, store_name: vendorMap.get(s.vendor_id) || "Unknown" }));
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, store_name").eq("status", "approved");
      return data || [];
    },
  });

  const createSub = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newSub.expires_days);
      const { error } = await supabase.from("vendor_subscriptions").insert({
        vendor_id: newSub.vendor_id,
        plan_name: newSub.plan_name,
        max_listings: newSub.max_listings,
        price: newSub.price,
        expires_at: expiresAt.toISOString(),
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Subscription created");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = subscriptions?.filter((s: any) =>
    s.store_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusColor = (s: string) => {
    if (s === "active") return "bg-success/10 text-success";
    if (s === "expired") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <h2 className="text-xl font-bold">Vendor Subscriptions</h2>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Subscription</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Vendor</Label>
                  <select
                    className="w-full border border-input rounded-md p-2 text-sm bg-background"
                    value={newSub.vendor_id}
                    onChange={(e) => setNewSub({ ...newSub, vendor_id: e.target.value })}
                  >
                    <option value="">Select vendor...</option>
                    {vendors?.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.store_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Plan Name</Label>
                  <Input value={newSub.plan_name} onChange={(e) => setNewSub({ ...newSub, plan_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Max Listings</Label>
                    <Input type="number" value={newSub.max_listings} onChange={(e) => setNewSub({ ...newSub, max_listings: parseInt(e.target.value) || 5 })} />
                  </div>
                  <div>
                    <Label>Price (KSh)</Label>
                    <Input type="number" value={newSub.price} onChange={(e) => setNewSub({ ...newSub, price: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div>
                  <Label>Duration (days)</Label>
                  <Input type="number" value={newSub.expires_days} onChange={(e) => setNewSub({ ...newSub, expires_days: parseInt(e.target.value) || 30 })} />
                </div>
                <Button className="w-full" onClick={() => createSub.mutate()} disabled={!newSub.vendor_id || createSub.isPending}>
                  {createSub.isPending ? "Creating..." : "Create Subscription"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Vendor</th>
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-left p-3 font-medium">Max Listings</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">Expires</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.store_name}</td>
                <td className="p-3 capitalize">{s.plan_name}</td>
                <td className="p-3">{s.max_listings}</td>
                <td className="p-3">KSh {Number(s.price).toLocaleString()}</td>
                <td className="p-3 text-muted-foreground">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No subscriptions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSubscriptions;
