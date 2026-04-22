import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

const orderStatusFlow = ["pending", "processing", "shipped", "delivered"];

const formatAddress = (addr: any) => {
  if (!addr) return "";
  const cityCountry = [addr.city, addr.country].filter(Boolean).join(", ");
  return [addr.fullName, addr.phone, addr.addressLine, cityCountry]
    .filter(Boolean)
    .join("\n");
};

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

  const copyAddress = async (addr: any) => {
    try {
      await navigator.clipboard.writeText(formatAddress(addr));
      toast.success("Delivery address copied");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const copyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      toast.success("Order ID copied");
    } catch {
      toast.error("Failed to copy order ID");
    }
  };

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
                    <th>Order</th>
                    <th>Product</th>
                    <th className="min-w-[260px]">Deliver to</th>
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
                    const cityCountry = [addr?.city, addr?.country].filter(Boolean).join(", ");
                    return (
                      <tr key={item.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => copyOrderId(item.order_id)}
                            className="font-mono text-xs bg-muted px-2 py-1 rounded font-semibold hover:bg-muted/70 transition-colors"
                            title="Click to copy full order ID"
                          >
                            #{item.order_id.slice(0, 8).toUpperCase()}
                          </button>
                        </td>
                        <td className="font-medium">
                          <div>{(item.products as any)?.name || "—"}</div>
                          {(item.variant_options as any)?.label && (
                            <span className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              {(item.variant_options as any).label}
                            </span>
                          )}
                        </td>
                        <td className="text-xs align-top">
                          <div className="space-y-0.5 leading-snug">
                            <div className="font-medium text-foreground">{addr?.fullName || "—"}</div>
                            {addr?.phone && <div className="text-muted-foreground">{addr.phone}</div>}
                            {addr?.addressLine && <div className="text-muted-foreground">{addr.addressLine}</div>}
                            {cityCountry && <div className="text-muted-foreground">{cityCountry}</div>}
                            {addr && (
                              <button
                                type="button"
                                onClick={() => copyAddress(addr)}
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                              >
                                <Copy className="h-3 w-3" /> Copy address
                              </button>
                            )}
                          </div>
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
              const cityCountry = [addr?.city, addr?.country].filter(Boolean).join(", ");
              return (
                <div key={item.id} className="admin-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => copyOrderId(item.order_id)}
                      className="font-mono text-xs bg-muted px-2 py-1 rounded font-semibold hover:bg-muted/70 transition-colors"
                      title="Click to copy full order ID"
                    >
                      #{item.order_id.slice(0, 8).toUpperCase()}
                    </button>
                    <span className={`status-pill ${statusColor(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm line-clamp-1">{(item.products as any)?.name || "—"}</p>
                      {(item.variant_options as any)?.label && (
                        <span className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          {(item.variant_options as any).label}
                        </span>
                      )}
                    </div>
                  </div>

                  {addr && (
                    <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
                          Deliver to
                        </span>
                        <button
                          type="button"
                          onClick={() => copyAddress(addr)}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                      <div className="space-y-0.5 leading-snug">
                        {addr.fullName && <div className="font-medium text-foreground">{addr.fullName}</div>}
                        {addr.phone && <div className="text-muted-foreground">📞 {addr.phone}</div>}
                        {addr.addressLine && <div className="text-muted-foreground">{addr.addressLine}</div>}
                        {cityCountry && <div className="text-muted-foreground">{cityCountry}</div>}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Qty: {item.quantity}
                      {order?.created_at && ` · ${new Date(order.created_at).toLocaleDateString()}`}
                    </span>
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
