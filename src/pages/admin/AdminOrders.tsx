import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

const AdminOrders = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-all"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = orders?.filter((o: any) =>
    o.id.includes(filter) || o.status.includes(filter.toLowerCase())
  ) || [];

  const statusColor = (s: string) => {
    if (s === "delivered") return "bg-success/10 text-success";
    if (s === "shipped") return "bg-primary/10 text-primary";
    return "bg-warning/10 text-warning";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <h2 className="text-xl font-bold">All Orders</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by ID or status..." className="pl-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Order ID</th>
              <th className="text-left p-3 font-medium">Total</th>
              <th className="text-left p-3 font-medium">Payment</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o: any) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="p-3 font-medium">KSh {Number(o.total).toLocaleString()}</td>
                <td className="p-3 text-xs">
                  <span className={`font-medium px-2 py-0.5 rounded-full ${o.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {o.payment_status}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>{o.status}</span>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
