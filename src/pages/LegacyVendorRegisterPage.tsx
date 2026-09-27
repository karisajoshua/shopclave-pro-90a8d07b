import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "lucide-react";

const friendlyError = (err: any): string => {
  const code = err?.code;
  const msg = String(err?.message || "");
  if (code === "23505" || /duplicate key/i.test(msg)) return "You've already applied to become a seller. Your application is being reviewed.";
  if (code === "42501" || /row-level security|permission/i.test(msg)) return "Your session has expired. Please sign in again and resubmit.";
  if (/JWT|not authenticated/i.test(msg)) return "Your session has expired. Please sign in again and resubmit.";
  if (/network|fetch/i.test(msg)) return "Connection problem. Please check your internet and try again.";
  return "We couldn't submit your application. Please try again.";
};

const LegacyVendorRegisterPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { state: { from: "/vendor/register" } });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("vendors").select("id,status").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (data?.status === "approved") { navigate("/vendor"); return; }
      setExistingStatus(data?.status ?? null);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  if (authLoading || !user || checking) {
    return <MarketplaceLayout><div className="container py-16 text-center text-muted-foreground">Loading…</div></MarketplaceLayout>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!storeName.trim()) {
      toast.error("Store name is required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    setLoading(true);
    try {
      const { error: vendorError } = await supabase.from("vendors").insert({
        user_id: user.id,
        store_name: storeName.trim(),
        store_description: storeDescription.trim() || null,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || null,
        website: website.trim() || null,
        status: "pending",
      });
      if (vendorError) {
        if (vendorError.code === "23505") {
          setExistingStatus("pending");
          toast.info(friendlyError(vendorError));
          return;
        }
        throw vendorError;
      }
      toast.success("Vendor application submitted! We'll review it shortly.");
      setExistingStatus("pending");
    } catch (err: any) {
      console.error("Vendor application failed:", err);
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  if (existingStatus) {
    const rejected = existingStatus === "rejected" || existingStatus === "suspended";
    return (
      <MarketplaceLayout>
        <div className="container py-12 max-w-lg">
          <div className="bg-card rounded-xl border border-border p-8 text-center space-y-4" role="status">
            <Store className="h-10 w-10 text-primary mx-auto" />
            <h1 className="font-display text-2xl font-bold">
              {rejected ? `Application ${existingStatus}` : "Your application is under review"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {rejected
                ? "Your seller application was not approved. Please contact support if you have questions."
                : "Thanks for applying! We'll notify you once your store is approved."}
            </p>
            <Button onClick={() => navigate(rejected ? "/contact" : "/account")}>
              {rejected ? "Contact support" : "Go to my account"}
            </Button>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="container py-12 max-w-lg">
        <div className="bg-card rounded-xl border border-border p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Become a Seller</h1>
            <p className="text-sm text-muted-foreground">Start listing your products on Barakaz marketplace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Store Name *</Label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Your Store Name" required />
            </div>
            <div>
              <Label>Store Description</Label>
              <Textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} placeholder="Tell customers about your store..." rows={4} />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +1 416 555 0123" required />
            </div>
            <div>
              <Label>WhatsApp Number</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="e.g. +1 416 555 0123" />
            </div>
            <div>
              <Label>Website (Optional)</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourstore.com" />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default LegacyVendorRegisterPage;
