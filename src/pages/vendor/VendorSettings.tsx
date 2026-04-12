import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const VendorSettings = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    store_name: vendor.store_name || "",
    store_description: vendor.store_description || "",
    logo_url: vendor.logo_url || "",
    banner_url: vendor.banner_url || "",
    phone: vendor.phone || "",
    phone2: vendor.phone2 || "",
    whatsapp: vendor.whatsapp || "",
    website: vendor.website || "",
    payment_details: vendor.payment_details || {},
  });
  const paymentDetails = form.payment_details as any;
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("vendors").update(form).eq("id", vendor.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
      toast.success("Store settings saved!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Store Settings</h2>
      <div className="bg-card rounded-lg border border-border p-6 max-w-lg space-y-4">
        <div>
          <Label>Store Name</Label>
          <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
        </div>
        <div>
          <Label>Store Description</Label>
          <Textarea value={form.store_description} onChange={(e) => setForm({ ...form, store_description: e.target.value })} rows={3} />
        </div>
        <div>
          <Label>Logo URL</Label>
          <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
        </div>
        <div>
          <Label>Banner URL</Label>
          <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
        </div>

        <h3 className="font-semibold pt-2 border-t border-border">Contact Information</h3>
        <p className="text-xs text-muted-foreground">Customers will see these on your product pages to contact you directly.</p>

        <div>
          <Label>Phone Number *</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
        </div>
        <div>
          <Label>Phone Number 2 (Optional)</Label>
          <Input value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} placeholder="+254 7XX XXX XXX" />
        </div>
        <div>
          <Label>WhatsApp Number</Label>
          <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+254 7XX XXX XXX" />
        </div>
        <div>
          <Label>Website (Optional)</Label>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://yourstore.com" />
        </div>

        <h3 className="font-semibold pt-2 border-t border-border">Payment Details</h3>
        <p className="text-xs text-muted-foreground">Customers will see these payment instructions at checkout.</p>

        <div>
          <Label>M-Pesa Till/Paybill Number</Label>
          <Input
            value={paymentDetails.mpesa_number || ""}
            onChange={(e) => setForm({ ...form, payment_details: { ...paymentDetails, mpesa_number: e.target.value } })}
            placeholder="e.g., Till 123456 or Paybill 654321"
          />
        </div>
        <div>
          <Label>Bank Name</Label>
          <Input
            value={paymentDetails.bank_name || ""}
            onChange={(e) => setForm({ ...form, payment_details: { ...paymentDetails, bank_name: e.target.value } })}
            placeholder="e.g., KCB, Equity"
          />
        </div>
        <div>
          <Label>Bank Account Number</Label>
          <Input
            value={paymentDetails.bank_account || ""}
            onChange={(e) => setForm({ ...form, payment_details: { ...paymentDetails, bank_account: e.target.value } })}
            placeholder="Account number"
          />
        </div>
        <div>
          <Label>Custom Payment Instructions</Label>
          <Textarea
            value={paymentDetails.custom_instructions || ""}
            onChange={(e) => setForm({ ...form, payment_details: { ...paymentDetails, custom_instructions: e.target.value } })}
            placeholder="Any additional payment instructions for customers..."
            rows={2}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default VendorSettings;
