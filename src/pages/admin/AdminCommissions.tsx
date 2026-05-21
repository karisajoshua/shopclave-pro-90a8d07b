import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string };
type Rate = { category_id: string; commission_pct: number };
type Settings = {
  default_commission_pct: number;
  payment_processing_pct: number;
  payment_processing_flat: number;
};

export default function AdminCommissions() {
  const [cats, setCats] = useState<Category[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Settings>({
    default_commission_pct: 12,
    payment_processing_pct: 2.9,
    payment_processing_flat: 0.3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cData }, { data: rData }, { data: sData }] = await Promise.all([
        supabase.from("categories").select("id,name,slug").is("parent_id", null).order("name"),
        supabase.from("category_commission_rates").select("category_id,commission_pct"),
        supabase.from("platform_fee_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      setCats((cData as Category[]) || []);
      const map: Record<string, number> = {};
      (rData as Rate[] | null)?.forEach((r) => (map[r.category_id] = Number(r.commission_pct)));
      setRates(map);
      if (sData) {
        setSettings({
          default_commission_pct: Number(sData.default_commission_pct),
          payment_processing_pct: Number(sData.payment_processing_pct),
          payment_processing_flat: Number(sData.payment_processing_flat),
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const rows = cats
        .filter((c) => rates[c.id] !== undefined && rates[c.id] !== null && !Number.isNaN(rates[c.id]))
        .map((c) => ({ category_id: c.id, commission_pct: rates[c.id] }));
      const [{ error: rErr }, { error: sErr }] = await Promise.all([
        supabase.from("category_commission_rates").upsert(rows, { onConflict: "category_id" }),
        supabase.from("platform_fee_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", 1),
      ]);
      if (rErr || sErr) throw rErr || sErr;
      toast.success("Commission rates saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Commissions & Fees"
        subtitle="Set the platform commission per top-level category and the payment processing fee."
      />

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Platform defaults</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Default commission (%)</Label>
            <Input
              type="number" step="0.1" min="0" max="50"
              value={settings.default_commission_pct}
              onChange={(e) => setSettings({ ...settings, default_commission_pct: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">Applied when a category has no specific rate.</p>
          </div>
          <div>
            <Label>Payment processing (%)</Label>
            <Input
              type="number" step="0.1" min="0" max="10"
              value={settings.payment_processing_pct}
              onChange={(e) => setSettings({ ...settings, payment_processing_pct: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Payment processing (flat, $)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={settings.payment_processing_flat}
              onChange={(e) => setSettings({ ...settings, payment_processing_flat: Number(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Category commission rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">{c.name}</span>
              <Input
                type="number" step="0.1" min="0" max="50"
                className="w-28"
                value={rates[c.id] ?? ""}
                placeholder={String(settings.default_commission_pct)}
                onChange={(e) =>
                  setRates({ ...rates, [c.id]: e.target.value === "" ? (undefined as any) : Number(e.target.value) })
                }
              />
              <span className="text-sm text-muted-foreground w-4">%</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
