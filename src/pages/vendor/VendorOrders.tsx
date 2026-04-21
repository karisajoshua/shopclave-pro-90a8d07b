import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

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
  const payColor = (s: string) =>
    s === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning";

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Orders"
        subtitle="Fulfil customer orders and keep statuses up to date."
        count={orderItems?.length || 0}
        countLabel="orders"
      />

      {!orderItems?.length ? (
        <div className="admin-card">
          <AdminEmptyState
            icon={Truck}
            title="No orders yet"
            description="Once customers place orders for your products, they'll appear here for fulfilment."
          />
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item: any) => {
                    const idx = orderStatusFlow.indexOf(item.status);
                    const next = idx < orderStatusFlow.length - 1 ? orderStatusFlow[idx + 1] : null;
                    const order = item.orders as any;
                    const addr = order?.shipping_address as any;
                    return (
                      <tr key={item.id}>
                        <td className="font-medium">{(item.products as any)?.name || "—"}</td>
                        <td className="text-xs">
                          <div className="font-medium text-foreground">{addr?.fullName || "—"}</div>
                          <div className="text-muted-foreground">{addr?.city || ""}</div>
                          {addr?.phone && <div className="text-muted-foreground">{addr.phone}</div>}
                        </td>
                        <td>{item.quantity}</td>
                        <td className="font-semibold">KSh {(Number(item.price) * item.quantity).toLocaleString()}</td>
                        <td>
                          <span className={`status-pill ${payColor(order?.payment_status)}`}>
                            {order?.payment_status || "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${statusColor(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {order?.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            {next ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => updateStatus.mutate({ id: item.id, status: next, productName: (item.products as any)?.name, orderId: item.order_id })}
                              >
                                Mark {next}
                              </Button>
                            ) : (
                              <div className="text-xs text-muted-foreground text-center">Completed</div>
                            )}
                            <Link to={`/orders/${item.order_id}/chat`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs w-full gap-1">
                                <MessageCircle className="h-3 w-3" /> Chat
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {orderItems.map((item: any) => {
              const idx = orderStatusFlow.indexOf(item.status);
              const next = idx < orderStatusFlow.length - 1 ? orderStatusFlow[idx + 1] : null;
              const order = item.orders as any;
              const addr = order?.shipping_address as any;
              return (
                <div key={item.id} className="admin-card p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm line-clamp-1">{(item.products as any)?.name || "—"}</p>
                    <span className={`status-pill ${statusColor(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Customer: <span className="text-foreground font-medium">{addr?.fullName || "—"}</span> — {addr?.city || ""}</p>
                    {addr?.phone && <p>📞 {addr.phone}</p>}
                    <p>{order?.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</p>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Qty: {item.quantity}</span>
                    <span className="font-semibold">KSh {(Number(item.price) * item.quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className={`status-pill ${payColor(order?.payment_status)}`}>{order?.payment_status || "—"}</span>
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
                          Mark {next}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default VendorOrders;
