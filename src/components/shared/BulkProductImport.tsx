import { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";

interface BulkProductImportProps {
  vendors?: { id: string; store_name: string }[];
  isAdmin?: boolean;
  vendorId?: string;
}

const TEMPLATE_HEADERS = ["name", "price", "stock", "description", "status", "category_slug"];
const TEMPLATE_ROWS = [
  ["Sample Product", "1999", "50", "A great product", "active", "electronics"],
  ["Another Product", "599", "100", "Another item", "draft", "fashion"],
];

const BulkProductImport = ({ vendors, isAdmin, vendorId }: BulkProductImportProps) => {
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(vendorId || "");
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadCSV = () => {
    const csv = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_ROWS.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_ROWS]);
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "product_import_template.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        setRows(json);
        setResult(null);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setRows(results.data);
          setResult(null);
        },
        error: () => toast.error("Failed to parse CSV"),
      });
    }
  };

  const handleImport = async () => {
    const vid = isAdmin ? selectedVendor : vendorId;
    if (!vid) { toast.error("Please select a vendor"); return; }
    if (rows.length === 0) { toast.error("No rows to import"); return; }

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        if (!row.name?.toString().trim() || !row.price) { failed++; continue; }
        const slug = row.name.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
        const { error } = await supabase.from("products").insert({
          vendor_id: vid,
          name: row.name.toString().trim(),
          slug,
          price: parseFloat(row.price) || 0,
          stock: parseInt(row.stock) || 0,
          description: row.description?.toString().trim() || null,
          status: row.status === "active" ? "active" : "draft",
        });
        if (error) { failed++; } else { success++; }
      } catch {
        failed++;
      }
    }

    setResult({ success, failed });
    setImporting(false);
    toast.success(`Imported ${success} products, ${failed} failed`);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Upload a CSV or Excel file to import products in bulk.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCSV}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadExcel}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {isAdmin && vendors && (
        <div>
          <Label>Vendor</Label>
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.store_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Click to upload CSV or Excel file</p>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{rows.length} rows parsed</span>
          </div>

          <div className="bg-secondary rounded-lg overflow-x-auto max-h-64">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr>
                  {Object.keys(rows[0]).map((key) => (
                    <th key={key} className="text-left p-2 font-medium">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="p-2 max-w-[150px] truncate">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && <p className="text-xs text-center text-muted-foreground py-2">...and {rows.length - 10} more rows</p>}
          </div>

          <Button className="w-full gap-2" onClick={handleImport} disabled={importing}>
            <Upload className="h-4 w-4" /> {importing ? "Importing..." : `Import ${rows.length} Products`}
          </Button>
        </>
      )}

      {result && (
        <div className="flex gap-4">
          <div className="flex items-center gap-1 text-sm" style={{ color: "hsl(var(--primary))" }}><CheckCircle className="h-4 w-4" /> {result.success} succeeded</div>
          {result.failed > 0 && <div className="flex items-center gap-1 text-destructive text-sm"><XCircle className="h-4 w-4" /> {result.failed} failed</div>}
        </div>
      )}
    </div>
  );
};

export default BulkProductImport;
