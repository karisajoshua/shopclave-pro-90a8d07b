import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { missingVendorProfileItems } from "@/lib/vendorProfileCompleteness";

const VendorProfileChecklist = ({ vendor, showLink = true }: { vendor: any; showLink?: boolean }) => {
  const missing = missingVendorProfileItems(vendor);
  if (missing.length === 0) return null;
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <AlertTriangle className="h-4 w-4 text-primary" />
        Complete your seller profile ({missing.length} missing)
      </div>
      <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
        {missing.map((m) => <li key={m}>{m}</li>)}
      </ul>
      {showLink && (
        <Button asChild size="sm"><Link to="/vendor/settings">Update details</Link></Button>
      )}
    </div>
  );
};

export default VendorProfileChecklist;
