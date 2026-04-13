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

const VendorRegisterPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth", { state: { from: "/vendor/register" } });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (vendorError) throw vendorError;

      toast.success("Vendor application submitted! We'll review it shortly.");
      navigate("/account");
    } catch (err: any) {
      toast.error(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

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
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" required />
            </div>
            <div>
              <Label>WhatsApp Number</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+254 7XX XXX XXX" />
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

export default VendorRegisterPage;
