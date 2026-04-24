import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";
import { Eye, MousePointer, Package, Users, AlertTriangle, ArrowUpCircle, Clock, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { PLANS, type Plan, isAdminUnlimited } from "@/lib/subscriptionPlans";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const VendorDashboard = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const { user, userRoles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = isAdminUnlimited(userRoles);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [transactionCode, setTransactionCode] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const { data: pendingPayment } = useQuery({
    queryKey: ["vendor-pending-payment", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_subscription_payments")
        .select("*")
        .eq("vendor_id", vendor.id)
        .eq("status", "pending_verification")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!vendor,
  });

  const { data: mpesaDetails } = useQuery({
    queryKey: ["mpesa-payment-details"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "mpesa_payment_details")
        .maybeSingle();
      return (data?.value as any) || {};
    },
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

  const openUpgradeDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setTransactionCode("");
    setPayerPhone("");
    setNotes("");
  };

  const submitPayment = async () => {
    if (!selectedPlan || !vendor || !user) return;
    if (!transactionCode.trim() || !payerPhone.trim()) {
      toast.error("M-Pesa code and phone number are required");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("vendor_subscription_payments").insert({
        vendor_id: vendor.id,
        plan_name: selectedPlan.key,
        price: selectedPlan.price,
        max_listings: selectedPlan.listings,
        expires_days: selectedPlan.expires_days,
        payment_method: "mpesa",
        transaction_code: transactionCode.trim(),
        payer_phone: payerPhone.trim(),
        notes: notes.trim() || null,
      } as any);
      if (error) throw error;
      toast.success("Payment submitted. Your plan will activate once an admin verifies your M-Pesa code.");
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ["vendor-subscription", vendor.id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-pending-payment", vendor.id] });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: "Product Views", value: totalViews, icon: Eye, color: "text-primary" },
    { label: "Contact Clicks", value: totalClicks, icon: MousePointer, color: "text-success" },
    { label: "Active Listings", value: isAdmin ? "Unlimited" : `${activeListings} / ${maxListings}`, icon: Package, color: "text-warning" },
    { label: "Followers", value: followerCount, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Vendor Overview"
        subtitle={`Welcome back to ${vendor?.store_name || "your store"}. Here's what's happening today.`}
      />

      {/* Pending payment banner */}
      {pendingPayment && (
        <div className="admin-card flex items-start gap-2.5 p-3 text-sm border-primary/30 bg-primary/5">
          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Payment pending verification</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Your <span className="capitalize font-medium text-foreground">{pendingPayment.plan_name}</span> plan is active. M-Pesa code <span className="font-mono">{pendingPayment.transaction_code}</span> awaiting admin review.
            </p>
          </div>
        </div>
      )}

      {/* Subscription warning */}
      {isExpiring && !pendingPayment && (
        <div className="admin-card flex items-center gap-2.5 p-3 text-sm border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span>Your subscription expires on {new Date(subscription!.expires_at!).toLocaleDateString()}. Upgrade or renew below.</span>
        </div>
      )}

      {/* Subscription info */}
      <div className="admin-card p-4">
        <p className="text-sm text-muted-foreground">
          Plan: <span className="font-semibold text-foreground capitalize">{isAdmin ? "Admin (Unlimited)" : (subscription?.plan_name || "Free")}</span>
          {!isAdmin && subscription?.expires_at && (
            <> · Expires: <span className="font-medium text-foreground">{new Date(subscription.expires_at).toLocaleDateString()}</span></>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-card admin-card-hover p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-muted ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Top Viewed Products */}
      {products && products.length > 0 && (
        <div className="space-y-3">
          <h3 className="admin-section-label">Your Products</h3>
          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table min-w-[400px]">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 10).map((p: any, idx: number) => (
                    <tr key={p.id}>
                      <td className="text-muted-foreground">{idx + 1}</td>
                      <td className="font-medium">{p.name}</td>
                      <td className="font-semibold">KSh {Number(p.price).toLocaleString()}</td>
                      <td>
                        <span className={`status-pill ${p.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Upgrade — hidden for admins */}
      {!isAdmin && (
        <div className="space-y-3">
          <h3 className="admin-section-label flex items-center gap-1.5">
            <ArrowUpCircle className="h-3.5 w-3.5 text-primary" /> Upgrade Your Plan
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLANS.filter(p => p.key !== "free").map((plan) => {
              const isCurrent = subscription?.plan_name?.toLowerCase() === plan.key;
              return (
                <div key={plan.key} className={`admin-card admin-card-hover p-4 text-center ${isCurrent ? "border-primary ring-1 ring-primary/20" : ""}`}>
                  <p className="font-semibold text-sm">{plan.name}</p>
                  <p className="text-lg font-bold mt-1">KSh {plan.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                  <p className="text-xs text-muted-foreground mt-2">{plan.listings} listings</p>
                  {isCurrent ? (
                    <p className="text-xs text-primary font-medium mt-3 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Current
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full text-xs"
                      onClick={() => openUpgradeDialog(plan)}
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade Payment Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={(o) => !o && setSelectedPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Pay <span className="font-semibold text-foreground">KSh {selectedPlan?.price.toLocaleString()}</span> via M-Pesa, then submit your transaction code.
            </DialogDescription>
          </DialogHeader>

          {/* M-Pesa instructions */}
          <div className="bg-secondary rounded-lg p-3 space-y-1.5 text-sm">
            <p className="font-semibold text-foreground">Payment Details</p>
            {mpesaDetails?.till_number && (
              <p><span className="text-muted-foreground">Till Number:</span> <span className="font-mono font-medium">{mpesaDetails.till_number}</span></p>
            )}
            {mpesaDetails?.paybill && (
              <p><span className="text-muted-foreground">Paybill:</span> <span className="font-mono font-medium">{mpesaDetails.paybill}</span></p>
            )}
            {mpesaDetails?.account_name && (
              <p><span className="text-muted-foreground">Account:</span> <span className="font-medium">{mpesaDetails.account_name}</span></p>
            )}
            {mpesaDetails?.phone && (
              <p><span className="text-muted-foreground">Phone:</span> <span className="font-mono font-medium">{mpesaDetails.phone}</span></p>
            )}
            {!mpesaDetails?.till_number && !mpesaDetails?.paybill && !mpesaDetails?.phone && (
              <p className="text-xs text-muted-foreground">Admin has not configured payment details yet. Please contact support.</p>
            )}
            {mpesaDetails?.instructions && (
              <p className="text-xs text-muted-foreground pt-1">{mpesaDetails.instructions}</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label>M-Pesa Transaction Code *</Label>
              <Input
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value.toUpperCase())}
                placeholder="e.g. SGH7K2P3LM"
                maxLength={20}
              />
            </div>
            <div>
              <Label>Phone Number Used *</Label>
              <Input
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                maxLength={20}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional info..."
                rows={2}
                maxLength={500}
              />
            </div>
          </div>

          <Button onClick={submitPayment} disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Payment & Activate Plan"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDashboard;
