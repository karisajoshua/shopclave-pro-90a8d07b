import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PackageDims { weightG: string; lengthCm: string; widthCm: string; heightCm: string; }

export const emptyPackageDims: PackageDims = { weightG: "", lengthCm: "", widthCm: "", heightCm: "" };

/** Returns an error message, or null when all four measurements are valid. */
export function validatePackageDims(d: PackageDims): string | null {
  const w = Number(d.weightG);
  if (!d.weightG || !Number.isInteger(w) || w < 1 || w > 70000) return "Package weight must be a whole number between 1 and 70,000 g";
  for (const [label, v] of [["Length", d.lengthCm], ["Width", d.widthCm], ["Height", d.heightCm]] as const) {
    const n = Number(v);
    if (!v || !Number.isFinite(n) || n < 0.1 || n > 300) return `Package ${label.toLowerCase()} must be between 0.1 and 300 cm`;
  }
  return null;
}

export function packageDimsToColumns(d: PackageDims) {
  return {
    weight_g: parseInt(d.weightG, 10),
    length_cm: parseFloat(d.lengthCm),
    width_cm: parseFloat(d.widthCm),
    height_cm: parseFloat(d.heightCm),
  };
}

export function packageDimsFromProduct(p: { weight_g?: number | null; length_cm?: number | null; width_cm?: number | null; height_cm?: number | null }): PackageDims {
  const s = (v: number | null | undefined) => (v == null ? "" : String(v));
  return { weightG: s(p.weight_g), lengthCm: s(p.length_cm), widthCm: s(p.width_cm), heightCm: s(p.height_cm) };
}

export const PackageMeasurementsFields = ({ value, onChange }: { value: PackageDims; onChange: (v: PackageDims) => void }) => {
  const field = (key: keyof PackageDims, label: string, unit: string, step: string) => (
    <div>
      <Label htmlFor={`pkg-${key}`}>{label} ({unit}) *</Label>
      <Input id={`pkg-${key}`} type="number" min="0" step={step} required value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })} placeholder={unit} />
    </div>
  );
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div>
        <p className="font-semibold text-sm">Shipping Package Measurements *</p>
        <p className="text-xs text-muted-foreground">Packed size and weight, used to calculate shipping at checkout. Required.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {field("weightG", "Weight", "g", "1")}
        {field("lengthCm", "Length", "cm", "0.1")}
        {field("widthCm", "Width", "cm", "0.1")}
        {field("heightCm", "Height", "cm", "0.1")}
      </div>
    </div>
  );
};
