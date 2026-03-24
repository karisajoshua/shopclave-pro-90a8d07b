import { useState } from "react";
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

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error("Store name is required");
      return;
    }
    setLoading(true);
    try {
      // Create vendor record
      const { error: vendorError } = await supabase.from("vendors").insert({
        user_id: user.id,
        store_name: storeName.trim(),
        store_description: storeDescription.trim() || null,
        status: "pending",
      });
      if (vendorError) throw vendorError;

      // Add vendor role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "vendor" as any,
      });
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

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
            <p className="text-sm text-muted-foreground">Start selling on ShopZone marketplace</p>
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
