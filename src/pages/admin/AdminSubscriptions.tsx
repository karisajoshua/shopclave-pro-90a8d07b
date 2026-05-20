import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Plus, CheckCircle, XCircle, Clock, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS } from "@/lib/subscriptionPlans";

const AdminSubscriptions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSub, setNewSub] = useState({ vendor_id: "", plan_name: "basic", max_listings: 20, price: 1000, expires_days: 30 });
  const [reviewPayment, setReviewPayment] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [entitlementSub, setEntitlementSub] = useState<any>(null);

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

      // active product counts per vendor for usage display
      const { data: productCounts } = await supabase
        .from("products")
        .select("vendor_id")
        .in("vendor_id", vendorIds)
        .eq("status", "active");
      const usageMap = new Map<string, number>();
      (productCounts || []).forEach((p: any) => {
        usageMap.set(p.vendor_id, (usageMap.get(p.vendor_id) || 0) + 1);
      });

      return subs.map((s: any) => ({
        ...s,
        store_name: vendorMap.get(s.vendor_id) || "Unknown",
        active_listings: usageMap.get(s.vendor_id) || 0,
      }));
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

  const findPlan = (planName?: string | null) => {
    if (!planName) return null;
    const key = planName.toLowerCase();
    return PLANS.find((p) => p.key === key || p.name.toLowerCase() === key) || null;
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
                  <td className="p-3">${Number(p.price).toLocaleString()}</td>
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
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-medium">Vendor</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Usage</th>
                <th className="text-left p-3 font-medium">Price</th>
                <th className="text-left p-3 font-medium">Expires</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Entitlements</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => {
                const used = s.active_listings || 0;
                const cap = s.max_listings || 0;
                const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
                const overLimit = cap > 0 && used > cap;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3 font-medium">{s.store_name}</td>
                    <td className="p-3 capitalize">{s.plan_name}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <span className={`text-xs ${overLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {used} / {cap === 9999 ? "Unlimited" : cap}
                        </span>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${overLimit ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">${Number(s.price).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "Never"}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setEntitlementSub(s)}
                      >
                        <Sparkles className="h-3 w-3" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No subscriptions yet</td></tr>
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
                <p><span className="text-muted-foreground">Amount:</span> <span className="font-medium">${Number(reviewPayment.price).toLocaleString()}</span></p>
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

      {/* Entitlements Dialog */}
      <Dialog open={!!entitlementSub} onOpenChange={(o) => !o && setEntitlementSub(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Plan Entitlements
            </DialogTitle>
          </DialogHeader>
          {entitlementSub && (() => {
            const plan = findPlan(entitlementSub.plan_name);
            const used = entitlementSub.active_listings || 0;
            const cap = entitlementSub.max_listings || 0;
            return (
              <div className="space-y-4 text-sm">
                <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                  <p className="font-semibold text-base">{entitlementSub.store_name}</p>
                  <p>
                    <span className="text-muted-foreground">Plan:</span>{" "}
                    <span className="font-medium capitalize">{entitlementSub.plan_name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Price paid:</span>{" "}
                    <span className="font-medium">${Number(entitlementSub.price).toLocaleString()}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Listing usage:</span>{" "}
                    <span className="font-medium">
                      {used} / {cap === 9999 ? "Unlimited" : cap}
                    </span>
                  </p>
                  {entitlementSub.expires_at && (
                    <p>
                      <span className="text-muted-foreground">Expires:</span>{" "}
                      <span className="font-medium">{new Date(entitlementSub.expires_at).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-medium mb-2">What this vendor is entitled to:</p>
                  {plan ? (
                    <ul className="space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Custom subscription — no preset feature list. Cap: {cap} listings.
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
