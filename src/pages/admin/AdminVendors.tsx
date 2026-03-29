import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const AdminVendors = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-detail"],
    queryFn: async () => {
      const { data: vendorData } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (!vendorData || vendorData.length === 0) return [];
      
      // Fetch profile names separately since there's no FK relationship
      const userIds = vendorData.map((v: any) => v.user_id);
      const { data: profileData } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      
      const profileMap = new Map((profileData || []).map((p: any) => [p.user_id, p.full_name]));
      return vendorData.map((v: any) => ({ ...v, owner_name: profileMap.get(v.user_id) || "—" }));
    },
    enabled: !!user,
  });

  const updateVendorStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vendors").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors-detail"] });
      toast.success("Vendor status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, commission_rate }: { id: string; commission_rate: number }) => {
      const { error } = await supabase.from("vendors").update({ commission_rate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors-detail"] });
      toast.success("Commission rate updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = vendors?.filter((v: any) =>
    v.store_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-success/10 text-success";
    if (s === "pending") return "bg-warning/10 text-warning";
    return "bg-destructive/10 text-destructive";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <h2 className="text-xl font-bold">Vendor Management</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Store</th>
              <th className="text-left p-3 font-medium">Owner</th>
              <th className="text-left p-3 font-medium">Commission</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v: any) => (
              <VendorRow
                key={v.id}
                vendor={v}
                statusColor={statusColor}
                onUpdateStatus={(status: string) => updateVendorStatus.mutate({ id: v.id, status })}
                onUpdateCommission={(rate: number) => updateCommission.mutate({ id: v.id, commission_rate: rate })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const VendorRow = ({ vendor: v, statusColor, onUpdateStatus, onUpdateCommission }: any) => {
  const [editRate, setEditRate] = useState(false);
  const [rate, setRate] = useState(String(v.commission_rate));

  return (
    <tr className="border-t border-border">
      <td className="p-3 font-medium">{v.store_name}</td>
      <td className="p-3 text-muted-foreground">{v.owner_name || "—"}</td>
      <td className="p-3">
        {editRate ? (
          <div className="flex items-center gap-1">
            <Input className="w-16 h-7 text-xs" type="number" min="0" max="100" value={rate} onChange={(e) => setRate(e.target.value)} />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onUpdateCommission(parseFloat(rate) || 10); setEditRate(false); }}>Save</Button>
          </div>
        ) : (
          <button onClick={() => setEditRate(true)} className="hover:underline">{v.commission_rate}%</button>
        )}
      </td>
      <td className="p-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(v.status)}`}>{v.status}</span>
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          {v.status !== "approved" && (
            <Button size="sm" variant="ghost" className="h-7 text-success" onClick={() => onUpdateStatus("approved")}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          {v.status === "approved" && (
            <Button size="sm" variant="ghost" className="h-7 text-warning" onClick={() => onUpdateStatus("suspended")}>
              Suspend
            </Button>
          )}
          {v.status !== "rejected" && (
            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => onUpdateStatus("rejected")}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default AdminVendors;
