import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const AdminSubscriptions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSub, setNewSub] = useState({ vendor_id: "", plan_name: "basic", max_listings: 20, price: 1000, expires_days: 30 });
  const [reviewPayment, setReviewPayment] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: pendingPayments } = useQuery({
    queryKey: ["admin-pending-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_subscription_payments")
        .select("*")
        .eq("status", "pending_verification")
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const vendorIds = [...new Set(data.map((p: any) => p.vendor_id))];
      const { data: vendors } = await supabase.from("vendors").select("id, store_name").in("id", vendorIds);
      const vendorMap = new Map((vendors || []).map((v: any) => [v.id, v.store_name]));
      return data.map((p: any) => ({ ...p, store_name: vendorMap.get(p.vendor_id) || "Unknown" }));
    },
  });

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

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "verified" | "rejected" }) => {
      const { error } = await supabase
        .from("vendor_subscription_payments")
        .update({
          status,
          admin_notes: adminNotes.trim() || null,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success(vars.status === "verified" ? "Payment verified" : "Payment rejected");
      setReviewPayment(null);
      setAdminNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = subscriptions?.filter((s: any) =>
    s.store_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusColor = (s: string) => {
    if (s === "active") return "bg-success/10 text-success";
    if (s === "expired" || s === "cancelled") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  return (
    <div className="space-y-6">
      {/* Pending Payments Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-warning" />
          <h2 className="text-xl font-bold">Pending Payment Verifications</h2>
          {pendingPayments && pendingPayments.length > 0 && (
            <span className="bg-warning/10 text-warning text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingPayments.length}
            </span>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-medium">Vendor</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">M-Pesa Code</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Submitted</th>
                <th className="text-left p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments?.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">{p.store_name}</td>
                  <td className="p-3 capitalize">{p.plan_name}</td>
                  <td className="p-3">KSh {Number(p.price).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{p.transaction_code}</td>
                  <td className="p-3 text-xs">{p.payer_phone}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => { setReviewPayment(p); setAdminNotes(""); }}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
              {(!pendingPayments || pendingPayments.length === 0) && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">No pending payments</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Subscriptions */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <h2 className="text-xl font-bold">All Vendor Subscriptions</h2>
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

      {/* Review Payment Dialog */}
      <Dialog open={!!reviewPayment} onOpenChange={(o) => !o && setReviewPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Review Payment</DialogTitle></DialogHeader>
          {reviewPayment && (
            <div className="space-y-3 text-sm">
              <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                <p><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{reviewPayment.store_name}</span></p>
                <p><span className="text-muted-foreground">Plan:</span> <span className="font-medium capitalize">{reviewPayment.plan_name}</span> ({reviewPayment.max_listings} listings)</p>
                <p><span className="text-muted-foreground">Amount:</span> <span className="font-medium">KSh {Number(reviewPayment.price).toLocaleString()}</span></p>
                <p><span className="text-muted-foreground">M-Pesa Code:</span> <span className="font-mono font-medium">{reviewPayment.transaction_code}</span></p>
                <p><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{reviewPayment.payer_phone}</span></p>
                {reviewPayment.notes && <p><span className="text-muted-foreground">Notes:</span> {reviewPayment.notes}</p>}
              </div>
              <div>
                <Label>Admin Notes (optional)</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} maxLength={500} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => reviewMutation.mutate({ id: reviewPayment.id, status: "rejected" })}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ id: reviewPayment.id, status: "verified" })}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Verify
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
