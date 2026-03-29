import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const AdminWithdrawals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const { data: withdrawals, refetch } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*, vendors(store_name, user_id)")
        .order("requested_at", { ascending: false });
      return data || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-withdrawals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { status };
      if (notes) updates.admin_notes = notes;
      if (status === "completed" || status === "rejected") updates.processed_at = new Date().toISOString();
      const { error } = await supabase.from("withdrawal_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Withdrawal updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totals = {
    pending: withdrawals?.filter((w: any) => w.status === "pending").reduce((s: number, w: any) => s + Number(w.amount), 0) || 0,
    completed: withdrawals?.filter((w: any) => w.status === "completed").reduce((s: number, w: any) => s + Number(w.amount), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Withdrawal Requests</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-warning" /><span className="text-sm text-muted-foreground">Pending</span></div>
          <p className="text-xl font-bold">KSh {totals.pending.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-success" /><span className="text-sm text-muted-foreground">Paid Out</span></div>
          <p className="text-xl font-bold">KSh {totals.completed.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Total Requests</span></div>
          <p className="text-xl font-bold">{withdrawals?.length || 0}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Vendor</th>
              <th className="text-left p-3 font-medium">Amount</th>
              <th className="text-left p-3 font-medium">Method</th>
              <th className="text-left p-3 font-medium">Details</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals?.map((w: any) => (
              <tr key={w.id} className="border-t border-border">
                <td className="p-3 font-medium">{(w.vendors as any)?.store_name || "—"}</td>
                <td className="p-3 font-bold">KSh {Number(w.amount).toLocaleString()}</td>
                <td className="p-3 capitalize">{w.payment_method?.replace("_", " ")}</td>
                <td className="p-3 text-xs font-mono max-w-[150px] truncate">
                  {w.payment_details ? JSON.stringify(w.payment_details) : "—"}
                </td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[w.status] || ""}`}>
                    {w.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(w.requested_at).toLocaleDateString()}</td>
                <td className="p-3">
                  {w.status === "pending" && (
                    <div className="flex gap-1 flex-col">
                      <Input
                        placeholder="Notes (optional)"
                        className="h-7 text-xs"
                        value={adminNotes[w.id] || ""}
                        onChange={(e) => setAdminNotes((prev) => ({ ...prev, [w.id]: e.target.value }))}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => updateStatus.mutate({ id: w.id, status: "approved", notes: adminNotes[w.id] })}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"
                          onClick={() => updateStatus.mutate({ id: w.id, status: "rejected", notes: adminNotes[w.id] })}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                  {w.status === "approved" && (
                    <Button size="sm" className="h-7 text-xs"
                      onClick={() => updateStatus.mutate({ id: w.id, status: "completed" })}>
                      Mark Completed
                    </Button>
                  )}
                  {(w.status === "completed" || w.status === "rejected") && (
                    <span className="text-xs text-muted-foreground">{w.admin_notes || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
            {(!withdrawals || withdrawals.length === 0) && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No withdrawal requests yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminWithdrawals;
