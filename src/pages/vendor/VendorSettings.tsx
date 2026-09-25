import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { convertImageToWebp } from "@/lib/imageToWebp";

type ImageKind = "logo" | "banner";

interface ImageUploadFieldProps {
  kind: ImageKind;
  label: string;
  value: string;
  userId: string;
  onChange: (url: string) => void;
}

const ImageUploadField = ({ kind, label, value, userId, onChange }: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = "";
    if (!original) return;
    if (!original.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (original.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    if (!userId) {
      toast.error("You must be signed in to upload");
      return;
    }
    setUploading(true);
    try {
      const file = await convertImageToWebp(original);
      const ext = file.name.split(".").pop() || "webp";
      const path = `uploads/${userId}/vendor-assets/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success(`${label} uploaded — click Save Settings to keep changes`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isLogo = kind === "logo";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex items-start gap-3">
        <div
          className={
            isLogo
              ? "h-24 w-24 shrink-0 rounded-md border border-border bg-muted overflow-hidden flex items-center justify-center"
              : "w-full max-w-sm aspect-video rounded-md border border-border bg-muted overflow-hidden flex items-center justify-center"
          }
        >
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        {isLogo && (
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={uploading}>
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
      {!isLogo && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {value ? "Replace banner" : "Upload banner"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={uploading}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {isLogo ? "Square image recommended (e.g., 400x400). Max 5MB." : "Wide image recommended (e.g., 1600x900). Max 5MB."}
      </p>
    </div>
  );
};

const VendorSettings = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    store_name: vendor.store_name || "",
    store_description: vendor.store_description || "",
    logo_url: vendor.logo_url || "",
    banner_url: vendor.banner_url || "",
    slug: vendor.slug || "",
    phone: vendor.phone || "",
    phone2: vendor.phone2 || "",
    whatsapp: vendor.whatsapp || "",
    website: vendor.website || "",
    payment_details: vendor.payment_details || {},
    warehouse_address: vendor.warehouse_address || {},
  });
  const paymentDetails = form.payment_details as any;
  const warehouse = form.warehouse_address as any;
  const [saving, setSaving] = useState(false);

  // Mirrors the server-side check used at checkout (validateWarehouse).
  const originIso = (() => {
    const c = String(warehouse.country || "").trim();
    if (c.length === 2) return c.toUpperCase();
    const map: Record<string, string> = { kenya: "KE", canada: "CA", "united states": "US", usa: "US", "united kingdom": "GB", uk: "GB", india: "IN", australia: "AU" };
    return map[c.toLowerCase()] ?? c.slice(0, 2).toUpperCase();
  })();
  const missingOrigin: string[] = [];
  if (!warehouse.street1?.trim()) missingOrigin.push("street address");
  if (!warehouse.city?.trim()) missingOrigin.push("city");
  if (!warehouse.country?.trim()) missingOrigin.push("country");
  if (!warehouse.phone?.trim()) missingOrigin.push("pickup phone number");
  if (["US", "CA", "AU", "IN"].includes(originIso) && !warehouse.state?.trim()) missingOrigin.push("state/province");
  if (["US", "CA", "GB", "DE", "FR", "AU", "IN", "CN", "NL", "ES", "IT"].includes(originIso) && !warehouse.zip?.trim()) missingOrigin.push("postal code");

  const handleSave = async () => {
    setSaving(true);
    try {
      if (missingOrigin.length > 0) {
        toast.warning(`Saved, but shipping is not ready yet — still missing: ${missingOrigin.join(", ")}.`);
      }
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
          <Label>Store URL</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">barakaz.com/store/</span>
            <Input
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-"),
                })
              }
              placeholder="your-store-name"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lowercase letters, numbers and hyphens only. Must be unique.
          </p>
        </div>

        <ImageUploadField
          kind="logo"
          label="Store Logo"
          value={form.logo_url}
          userId={user?.id || ""}
          onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
        />

        <ImageUploadField
          kind="banner"
          label="Store Banner"
          value={form.banner_url}
          userId={user?.id || ""}
          onChange={(url) => setForm((f) => ({ ...f, banner_url: url }))}
        />

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

        <h3 className="font-semibold pt-2 border-t border-border">Shipping Origin Address</h3>
        <p className="text-xs text-muted-foreground">Used to calculate live shipping rates for buyers at checkout. Required for your products to be shippable.</p>

        {missingOrigin.length > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/10 text-warning p-3 text-xs">
            Shipping origin is incomplete — buyers cannot check out your products until you add: {missingOrigin.join(", ")}.
          </div>
        )}

        <div>
          <Label>Pickup Phone Number *</Label>
          <Input
            value={warehouse.phone || ""}
            onChange={(e) => setForm({ ...form, warehouse_address: { ...warehouse, phone: e.target.value } })}
            placeholder="Phone the courier can call at pickup, with country code"
          />
        </div>

        <div>
          <Label>Street Address</Label>
          <Input
            value={warehouse.street1 || ""}
            onChange={(e) => setForm({ ...form, warehouse_address: { ...warehouse, street1: e.target.value } })}
            placeholder="e.g., 123 Moi Avenue"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City</Label>
            <Input
              value={warehouse.city || ""}
              onChange={(e) => setForm({ ...form, warehouse_address: { ...warehouse, city: e.target.value } })}
              placeholder="Nairobi"
            />
          </div>
          <div>
            <Label>State / Region</Label>
            <Input
              value={warehouse.state || ""}
              onChange={(e) => setForm({ ...form, warehouse_address: { ...warehouse, state: e.target.value } })}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>ZIP / Postal Code</Label>
            <Input
              value={warehouse.zip || ""}
              onChange={(e) => setForm({ ...form, warehouse_address: { ...warehouse, zip: e.target.value } })}
              placeholder="00100"
            />
          </div>
          <div>
            <Label>Country (ISO code or name)</Label>
            <Input
              value={warehouse.country || ""}
              onChange={(e) => setForm({ ...form, warehouse_address: { ...warehouse, country: e.target.value } })}
              placeholder="KE"
            />
          </div>
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
