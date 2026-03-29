import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";

const VendorEarnings = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();

  const { data: orderItems } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("vendor_id", vendor.id);
      return data || [];
    },
    enabled: !!vendor,
  });

  const totalRevenue = orderItems?.reduce((sum, i: any) => sum + Number(i.price) * i.quantity, 0) || 0;
  const totalCommission = orderItems?.reduce((sum, i: any) => sum + Number(i.commission_amount), 0) || 0;
  const netEarnings = totalRevenue - totalCommission;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Earnings</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Gross Revenue</p>
          <p className="text-2xl font-bold">KSh {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Commission ({vendor.commission_rate}%)</p>
          <p className="text-2xl font-bold text-destructive">- KSh {totalCommission.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Net Earnings</p>
          <p className="text-2xl font-bold text-success">KSh {netEarnings.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default VendorEarnings;
