import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Settings, DollarSign, Store } from "lucide-react";

const CURRENCIES = ["KES", "USD", "EUR", "GBP", "UGX", "TZS", "NGN", "ZAR"];

const AdminSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});

  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (rawSettings) {
      const map: Record<string, string> = {};
      rawSettings.forEach((s: any) => {
        try { map[s.key] = JSON.parse(s.value); } catch { map[s.key] = s.value; }
      });
      setSettings(map);
    }
  }, [rawSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(settings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }));
      for (const row of rows) {
        const { error } = await supabase.from("platform_settings").upsert(row, { onConflict: "key" });
        if (error) throw error;
      }
      // Propagate commission rate to all vendors
      if (settings.default_commission_rate) {
        const rate = parseFloat(settings.default_commission_rate);
        if (!isNaN(rate)) {
          const { error } = await supabase.from("vendors").update({ commission_rate: rate }).gte("id", "00000000-0000-0000-0000-000000000000");
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  if (isLoading) return <div className="text-muted-foreground">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Platform Settings</h2>
        <Button className="gap-1.5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save All"}
        </Button>
      </div>

      {/* General */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">General</CardTitle>
          </div>
          <CardDescription>Basic platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Platform Name</Label>
            <Input value={settings.platform_name || ""} onChange={(e) => update("platform_name", e.target.value)} />
          </div>
          <div>
            <Label>Support Email</Label>
            <Input type="email" value={settings.support_email || ""} onChange={(e) => update("support_email", e.target.value)} />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={settings.currency || "KES"} onValueChange={(v) => update("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Commerce */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Commerce</CardTitle>
          </div>
          <CardDescription>Financial and order settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Commission Rate (%)</Label>
            <Input type="number" min="0" max="100" value={settings.default_commission_rate || "10"} onChange={(e) => update("default_commission_rate", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">⚠️ Changing this will update ALL existing vendors' commission rate</p>
          </div>
          <div>
            <Label>Minimum Order Amount</Label>
            <Input type="number" min="0" value={settings.min_order_amount || "0"} onChange={(e) => update("min_order_amount", e.target.value)} />
          </div>
          <div>
            <Label>Free Shipping Threshold</Label>
            <Input type="number" min="0" value={settings.free_shipping_threshold || "5000"} onChange={(e) => update("free_shipping_threshold", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Orders above this amount get free shipping. Set 0 to disable.</p>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Policy */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Vendor Policy</CardTitle>
          </div>
          <CardDescription>Controls for vendor management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-approve New Vendors</Label>
              <p className="text-xs text-muted-foreground">Vendors go live immediately without admin review</p>
            </div>
            <Switch checked={settings.vendor_auto_approve === "true"} onCheckedChange={(c) => update("vendor_auto_approve", c ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">Disable the storefront for customers</p>
            </div>
            <Switch checked={settings.maintenance_mode === "true"} onCheckedChange={(c) => update("maintenance_mode", c ? "true" : "false")} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
