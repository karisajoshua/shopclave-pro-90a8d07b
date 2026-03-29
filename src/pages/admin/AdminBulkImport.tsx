import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BulkProductImport from "@/components/shared/BulkProductImport";

const AdminBulkImport = () => {
  const { user } = useAuth();

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, store_name").eq("status", "approved");
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Bulk Product Import</h2>
      <BulkProductImport vendors={vendors || []} isAdmin />
    </div>
  );
};

export default AdminBulkImport;
