import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck } from "lucide-react";

export type ShipKey = "standard" | "express" | "free" | "pickup";
export type ShippingOptions = Record<ShipKey, { enabled: boolean; days: string; price: number }>;

export const DEFAULT_SHIPPING_OPTIONS: ShippingOptions = {
  standard: { enabled: true, days: "3-7", price: 12.5 },
  express: { enabled: true, days: "1-3", price: 19.99 },
  free: { enabled: false, days: "3-7", price: 0 },
  pickup: { enabled: false, days: "1-2", price: 0 },
};

export const SHIP_LABELS: Record<ShipKey, string> = {
  standard: "Standard Shipping", express: "Express Shipping", free: "Free Shipping", pickup: "Local Pickup",
};

const DAY_CHOICES = ["1-2", "1-3", "2-5", "3-7", "5-10", "7-14"];

export function normalizeShippingOptions(v: unknown): ShippingOptions {
  const src = (v && typeof v === "object" ? v : {}) as Partial<ShippingOptions>;
  const out = { ...DEFAULT_SHIPPING_OPTIONS };
  (Object.keys(out) as ShipKey[]).forEach((k) => {
    const s = src[k];
    if (s) out[k] = {
      enabled: !!s.enabled,
      days: typeof s.days === "string" && s.days ? s.days : out[k].days,
      price: k === "free" || k === "pickup" ? 0 : Math.max(0, Number(s.price) || 0),
    };
  });
  return out;
}

export function validateShippingOptions(o: ShippingOptions): string | null {
  if (!(Object.keys(o) as ShipKey[]).some((k) => o[k].enabled)) return "Enable at least one shipping option";
  for (const k of ["standard", "express"] as const) if (o[k].enabled && !(o[k].price > 0)) return `${SHIP_LABELS[k]} needs a price`;
  return null;
}

export const shipDaysLabel = (k: ShipKey, days: string) =>
  k === "pickup" ? `Ready in ${days.replace("-", "–")} business days` : `${days.replace("-", "–")} business days`;

export const ShippingOptionsFields = ({ value, onChange }: { value: ShippingOptions; onChange: (v: ShippingOptions) => void }) => {
  const set = (k: ShipKey, patch: Partial<ShippingOptions[ShipKey]>) => onChange({ ...value, [k]: { ...value[k], ...patch } });
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start gap-2">
        <Truck className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">Shipping Options *</p>
          <p className="text-xs text-muted-foreground">Select the options you offer and set delivery time and price.</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {(Object.keys(SHIP_LABELS) as ShipKey[]).map((k) => {
          const isFree = k === "free" || k === "pickup";
          return (
            <div key={k} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_1fr_1fr_120px]">
              <Checkbox id={`ship-${k}`} checked={value[k].enabled} onCheckedChange={(c) => set(k, { enabled: !!c })} />
              <Label htmlFor={`ship-${k}`} className="text-sm font-medium">
                {SHIP_LABELS[k]} {isFree && <span className="font-normal text-muted-foreground">(Optional)</span>}
              </Label>
              <div className="col-span-2 sm:col-span-1">
                <Select value={value[k].days} onValueChange={(d) => set(k, { days: d })} disabled={!value[k].enabled}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAY_CHOICES.map((d) => <SelectItem key={d} value={d}>{shipDaysLabel(k, d)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground">CA$</span>
                <Input type="number" min="0" step="0.01" className="h-9" disabled={isFree || !value[k].enabled}
                  value={isFree ? "0.00" : String(value[k].price)} onChange={(e) => set(k, { price: Number(e.target.value) })} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface InventoryExtras {
  barcode: string; costPerItem: string; trackInventory: boolean; lowStock: string;
  allowBackorders: boolean; minQty: string; maxQty: string;
}
export const emptyInventoryExtras: InventoryExtras = { barcode: "", costPerItem: "", trackInventory: true, lowStock: "", allowBackorders: false, minQty: "1", maxQty: "" };

export function inventoryExtrasFromProduct(p: any): InventoryExtras {
  const s = (v: any) => (v == null ? "" : String(v));
  return { barcode: s(p.barcode), costPerItem: s(p.cost_per_item), trackInventory: p.track_inventory ?? true, lowStock: s(p.low_stock_threshold), allowBackorders: !!p.allow_backorders, minQty: s(p.min_order_qty ?? 1), maxQty: s(p.max_order_qty) };
}

export function validateInventoryExtras(x: InventoryExtras): string | null {
  const min = parseInt(x.minQty || "1", 10);
  if (!Number.isInteger(min) || min < 1) return "Minimum order quantity must be at least 1";
  if (x.maxQty && (!(parseInt(x.maxQty, 10) >= min))) return "Maximum order quantity must be at least the minimum";
  if (x.barcode && !/^\d{8,14}$/.test(x.barcode.trim())) return "Barcode must be 8–14 digits (GTIN/UPC/EAN)";
  return null;
}

export function inventoryExtrasToColumns(x: InventoryExtras) {
  return {
    barcode: x.barcode.trim() || null,
    cost_per_item: x.costPerItem ? Number(x.costPerItem) : null,
    track_inventory: x.trackInventory,
    low_stock_threshold: x.lowStock ? parseInt(x.lowStock, 10) : null,
    allow_backorders: x.allowBackorders,
    min_order_qty: parseInt(x.minQty || "1", 10) || 1,
    max_order_qty: x.maxQty ? parseInt(x.maxQty, 10) : null,
  };
}

export const InventoryExtrasFields = ({ value, onChange }: { value: InventoryExtras; onChange: (v: InventoryExtras) => void }) => {
  const set = (p: Partial<InventoryExtras>) => onChange({ ...value, ...p });
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <Label>Barcode / GTIN (Optional)</Label>
        <Input inputMode="numeric" value={value.barcode} onChange={(e) => set({ barcode: e.target.value })} placeholder="UPC / EAN" />
      </div>
      <div>
        <Label>Cost per Item (CAD) (Optional)</Label>
        <Input type="number" min="0" step="0.01" value={value.costPerItem} onChange={(e) => set({ costPerItem: e.target.value })} />
        <p className="mt-1 text-[11px] text-muted-foreground">Only visible to you</p>
      </div>
      <div>
        <Label>Low Stock Alert (Optional)</Label>
        <Input type="number" min="0" value={value.lowStock} onChange={(e) => set({ lowStock: e.target.value })} />
      </div>
      <div className="flex items-center gap-2"><Switch checked={value.trackInventory} onCheckedChange={(c) => set({ trackInventory: c })} /><span className="text-sm">Track stock quantity</span></div>
      <div className="flex items-center gap-2 sm:col-span-2"><Switch checked={value.allowBackorders} onCheckedChange={(c) => set({ allowBackorders: c })} /><span className="text-sm">Allow backorders (orders when out of stock)</span></div>
      <div>
        <Label>Minimum Order Quantity</Label>
        <Input type="number" min="1" value={value.minQty} onChange={(e) => set({ minQty: e.target.value })} />
      </div>
      <div>
        <Label>Maximum Order Quantity (Optional)</Label>
        <Input type="number" min="1" value={value.maxQty} onChange={(e) => set({ maxQty: e.target.value })} />
      </div>
    </div>
  );
};

export type SpecRowInput = { name: string; value: string };
export const SPEC_SUGGESTIONS = ["Material", "Colour", "Size", "Model", "Warranty", "Country of origin"];

export function normalizeSpecifications(v: unknown): SpecRowInput[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: SpecRowInput[] = [];
  for (const r of v) {
    const name = String((r as any)?.name ?? "").trim().slice(0, 60);
    const value = String((r as any)?.value ?? "").trim().slice(0, 200);
    if (!name || !value || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, value });
    if (out.length >= 30) break;
  }
  return out;
}

export function validateSpecifications(rows: SpecRowInput[]): string | null {
  for (const r of rows) {
    const n = r.name.trim(), v = r.value.trim();
    if (!n && !v) continue;
    if (!n || !v) return "Each specification needs both a name and a value";
    if (n.length > 60) return "Specification names must be 60 characters or less";
    if (v.length > 200) return "Specification values must be 200 characters or less";
  }
  if (rows.filter((r) => r.name.trim()).length > 30) return "Up to 30 specifications allowed";
  return null;
}

export const SpecificationsFields = ({ value, onChange }: { value: SpecRowInput[]; onChange: (v: SpecRowInput[]) => void }) => {
  const rows = value.length ? value : [{ name: "", value: "" }];
  const set = (i: number, p: Partial<SpecRowInput>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-2">
      <Label>Specifications (Optional)</Label>
      <p className="text-xs text-muted-foreground">Add details like Material, Colour or Warranty. These show in the product's Specifications table.</p>
      <datalist id="spec-suggestions">{SPEC_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <Input list="spec-suggestions" placeholder="Name (e.g. Material)" maxLength={60} value={r.name} onChange={(e) => set(i, { name: e.target.value })} />
          <Input placeholder="Value (e.g. Cotton)" maxLength={200} value={r.value} onChange={(e) => set(i, { value: e.target.value })} />
          <button type="button" aria-label="Remove specification" className="h-10 w-10 rounded-md text-destructive hover:bg-destructive/10"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      {rows.length < 30 && (
        <button type="button" className="text-sm font-medium text-primary" onClick={() => onChange([...rows, { name: "", value: "" }])}>+ Add specification</button>
      )}
    </div>
  );
};
