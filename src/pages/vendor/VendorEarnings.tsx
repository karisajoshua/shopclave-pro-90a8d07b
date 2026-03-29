import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Wallet, Clock } from "lucide-react";

interface PaymentDetails {
  phone?: string;
  email?: string;
  account_name?: string;
  bank_name?: string;
  branch?: string;
  account_number?: string;
  swift_code?: string;
}

const VendorEarnings = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({});

  const updateDetail = (key: keyof PaymentDetails, value: string) =>
    setPaymentDetails((prev) => ({ ...prev, [key]: value }));

  const handleMethodChange = (method: string) => {
    setPaymentMethod(method);
    setPaymentDetails({});
  };

  const { data: orderItems } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*, products(name)").eq("vendor_id", vendor.id);
      return data || [];
    },
    enabled: !!vendor,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["vendor-withdrawals", vendor?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("withdrawal_requests")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("requested_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendor,
  });

  const totalRevenue = orderItems?.reduce((sum: number, i: any) => sum + Number(i.price) * i.quantity, 0) || 0;
  const totalCommission = orderItems?.reduce((sum: number, i: any) => sum + Number(i.commission_amount), 0) || 0;
  const netEarnings = totalRevenue - totalCommission;
  const withdrawnOrPending = withdrawals
    ?.filter((w: any) => w.status === "completed" || w.status === "pending" || w.status === "approved")
    .reduce((s: number, w: any) => s + Number(w.amount), 0) || 0;
  const availableBalance = netEarnings - withdrawnOrPending;

  const topProducts = (() => {
    const map: Record<string, { name: string; units: number; revenue: number }> = {};
    orderItems?.forEach((i: any) => {
      const pid = i.product_id;
      if (!pid) return;
      if (!map[pid]) map[pid] = { name: (i.products as any)?.name || "Unknown", units: 0, revenue: 0 };
      map[pid].units += i.quantity;
      map[pid].revenue += Number(i.price) * i.quantity;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  })();

  const validateDetails = (): string | null => {
    if (paymentMethod === "mpesa") {
      if (!paymentDetails.phone?.trim()) return "Enter M-Pesa phone number";
    } else if (paymentMethod === "bank_transfer") {
      if (!paymentDetails.account_name?.trim()) return "Enter account name";
      if (!paymentDetails.bank_name?.trim()) return "Enter bank name";
      if (!paymentDetails.account_number?.trim()) return "Enter account number";
    } else if (paymentMethod === "paypal") {
      if (!paymentDetails.email?.trim()) return "Enter PayPal email";
    }
    return null;
  };

  const requestWithdrawal = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0 || amt > availableBalance) throw new Error("Invalid amount");
      const detailError = validateDetails();
      if (detailError) throw new Error(detailError);
      const { error } = await (supabase as any).from("withdrawal_requests").insert({
        vendor_id: vendor.id,
        amount: amt,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-withdrawals", vendor?.id] });
      setAmount("");
      setPaymentDetails({});
      toast({ title: "Withdrawal requested successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-primary/10 text-primary",
    completed: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Earnings & Withdrawals</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><DollarSign className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-xs text-muted-foreground">Gross Revenue</p>
          <p className="text-lg font-bold">KSh {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><TrendingUp className="h-4 w-4 text-destructive" /></div>
          <p className="text-xs text-muted-foreground">Platform Fee ({vendor?.commission_rate}%)</p>
          <p className="text-lg font-bold text-destructive">- KSh {totalCommission.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><Wallet className="h-4 w-4 text-success" /></div>
          <p className="text-xs text-muted-foreground">Net Earnings</p>
          <p className="text-lg font-bold text-success">KSh {netEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><Clock className="h-4 w-4 text-primary" /></div>
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-lg font-bold text-primary">KSh {Math.max(0, availableBalance).toLocaleString()}</p>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-semibold mb-4">Request Withdrawal</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Amount (KSh)</Label>
              <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} max={availableBalance} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={handleMethodChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* M-Pesa fields */}
          {paymentMethod === "mpesa" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Phone Number</Label>
                <Input placeholder="254..." value={paymentDetails.phone || ""} onChange={(e) => updateDetail("phone", e.target.value)} />
              </div>
            </div>
          )}

          {/* Bank Transfer fields */}
          {paymentMethod === "bank_transfer" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Account Name</Label>
                <Input placeholder="John Doe" value={paymentDetails.account_name || ""} onChange={(e) => updateDetail("account_name", e.target.value)} />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input placeholder="e.g. Equity Bank" value={paymentDetails.bank_name || ""} onChange={(e) => updateDetail("bank_name", e.target.value)} />
              </div>
              <div>
                <Label>Branch</Label>
                <Input placeholder="e.g. Nairobi CBD" value={paymentDetails.branch || ""} onChange={(e) => updateDetail("branch", e.target.value)} />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input placeholder="Account #" value={paymentDetails.account_number || ""} onChange={(e) => updateDetail("account_number", e.target.value)} />
              </div>
              <div>
                <Label>SWIFT Code</Label>
                <Input placeholder="e.g. EABORBI" value={paymentDetails.swift_code || ""} onChange={(e) => updateDetail("swift_code", e.target.value)} />
              </div>
            </div>
          )}

          {/* PayPal fields */}
          {paymentMethod === "paypal" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>PayPal Email</Label>
                <Input type="email" placeholder="email@example.com" value={paymentDetails.email || ""} onChange={(e) => updateDetail("email", e.target.value)} />
              </div>
            </div>
          )}

          <Button onClick={() => requestWithdrawal.mutate()} disabled={requestWithdrawal.isPending || availableBalance <= 0}>
            {requestWithdrawal.isPending ? "Submitting..." : "Request Withdrawal"}
          </Button>
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Top Performing Products</h3>
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium">Units Sold</th>
                  <th className="text-left p-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.units}</td>
                    <td className="p-3">KSh {p.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdrawal History */}
      <div>
        <h3 className="font-semibold mb-3">Withdrawal History</h3>
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Method</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals?.map((w: any) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="p-3 font-bold">KSh {Number(w.amount).toLocaleString()}</td>
                  <td className="p-3 capitalize">{w.payment_method?.replace("_", " ")}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[w.status] || ""}`}>{w.status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(w.requested_at).toLocaleDateString()}</td>
                  <td className="p-3 text-xs text-muted-foreground">{w.admin_notes || "—"}</td>
                </tr>
              ))}
              {(!withdrawals || withdrawals.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No withdrawals yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorEarnings;
