import { useOutletContext } from "react-router-dom";
import BulkProductImport from "@/components/shared/BulkProductImport";

const VendorBulkImport = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Bulk Product Import</h2>
      <BulkProductImport vendorId={vendor.id} />
    </div>
  );
};

export default VendorBulkImport;
