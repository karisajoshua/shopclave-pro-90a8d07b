import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const orderStatusFlow = ["pending", "processing", "shipped", "delivered"];

const VendorOrders = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const queryClient = useQueryClient();

  const { data: orderItems } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("*, orders(status, created_at, shipping_address, total, payment_method, payment_status), products(name)")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!vendor,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, productName, orderId }: { id: string; status: string; productName?: string; orderId?: string }) => {
      const { error } = await supabase.from("order_items").update({ status }).eq("id", id);
      if (error) throw error;

      // Notify customer about status change
      if (orderId) {
        const { data: order } = await supabase.from("orders").select("user_id").eq("id", orderId).single();
        if (order?.user_id) {
          await supabase.from("notifications").insert({
            recipient_id: order.user_id,
            title: "Order Update",
            message: `Your order${productName ? ` for "${productName}"` : ""} has been marked as ${status}`,
            type: "order",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });

  const statusColor = (s: string) => {
    if (s === "delivered") return "bg-success/10 text-success";
    if (s === "shipped") return "bg-primary/10 text-primary";
    if (s === "processing") return "bg-warning/10 text-warning";
    return "bg-muted text-muted-foreground";
  };

  if (!orderItems?.length) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Orders ({orderItems.length})</h2>

      {/* Desktop */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Product</th>
              <th className="text-left p-3 font-medium">Customer</th>
              <th className="text-left p-3 font-medium">Qty</th>
              <th className="text-left p-3 font-medium">Total</th>
              <th className="text-left p-3 font-medium">Payment</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item: any) => {
              const idx = orderStatusFlow.indexOf(item.status);
              const next = idx < orderStatusFlow.length - 1 ? orderStatusFlow[idx + 1] : null;
              const order = item.orders as any;
              const addr = order?.shipping_address as any;
              return (
                <tr key={item.id} className="border-t border-border">
                  <td className="p-3 font-medium">{(item.products as any)?.name || "—"}</td>
                  <td className="p-3 text-xs">
                    <div>{addr?.fullName || "—"}</div>
                    <div className="text-muted-foreground">{addr?.city || ""}</div>
                    {addr?.phone && <div className="text-muted-foreground">{addr.phone}</div>}
                  </td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">KSh {(Number(item.price) * item.quantity).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order?.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {order?.payment_status || "—"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {order?.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 space-y-1">
                    {next ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs w-full"
                        onClick={() => updateStatus.mutate({ id: item.id, status: next, productName: (item.products as any)?.name, orderId: item.order_id })}
                      >
                        Mark {next}
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground">Completed</div>
                    )}
                    <Link to={`/orders/${item.order_id}/chat`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs w-full gap-1">
                        <MessageCircle className="h-3 w-3" /> Chat
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {orderItems.map((item: any) => {
          const idx = orderStatusFlow.indexOf(item.status);
          const next = idx < orderStatusFlow.length - 1 ? orderStatusFlow[idx + 1] : null;
          const order = item.orders as any;
          const addr = order?.shipping_address as any;
          return (
            <div key={item.id} className="bg-card rounded-lg border border-border p-4 space-y-2">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm">{(item.products as any)?.name || "—"}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Customer: {addr?.fullName || "—"} — {addr?.city || ""}</p>
                {addr?.phone && <p>📞 {addr.phone}</p>}
                <p>{order?.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</p>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Qty: {item.quantity}</span>
                <span>KSh {(Number(item.price) * item.quantity).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order?.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {order?.payment_status || "—"}
                </span>
                <div className="flex gap-1">
                  <Link to={`/orders/${item.order_id}/chat`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      <MessageCircle className="h-3 w-3" /> Chat
                    </Button>
                  </Link>
                  {next && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => updateStatus.mutate({ id: item.id, status: next, productName: (item.products as any)?.name, orderId: item.order_id })}
                    >
                      Mark as {next}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorOrders;
