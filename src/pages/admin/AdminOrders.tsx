import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, Package } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const statusColor = (s: string) => {
  if (s === "delivered") return "bg-success/10 text-success";
  if (s === "shipped") return "bg-primary/10 text-primary";
  if (s === "processing") return "bg-warning/10 text-warning";
  return "bg-muted text-muted-foreground";
};

const AdminOrders = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: orderItems } = useQuery({
    queryKey: ["admin-order-items-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("*, products(name, slug), vendors(store_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const filtered =
    orders?.filter(
      (o: any) =>
        o.id.includes(filter) || o.status.includes(filter.toLowerCase())
    ) || [];

  const getItemsForOrder = (orderId: string) =>
    orderItems?.filter((i: any) => i.order_id === orderId) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <h2 className="text-xl font-bold">All Orders ({filtered.length})</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by ID or status..."
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any) => {
            const items = getItemsForOrder(o.id);
            const isExpanded = expandedOrder === o.id;
            return (
              <div
                key={o.id}
                className="bg-card rounded-lg border border-border overflow-hidden"
              >
                {/* Order header row */}
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() =>
                    setExpandedOrder(isExpanded ? null : o.id)
                  }
                >
                  <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      #{o.id.slice(0, 8)}
                    </span>
                    <span className="font-semibold text-sm">
                      KSh {Number(o.total).toLocaleString()}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        o.payment_status === "paid"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {o.payment_status}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(
                        o.status
                      )}`}
                    >
                      {o.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Expanded order items */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Shipping info */}
                    {o.shipping_address && (
                      <div className="px-4 py-3 bg-secondary/30 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          <strong>Ship to:</strong>{" "}
                          {(o.shipping_address as any).fullName}
                        </span>
                        <span>
                          {(o.shipping_address as any).addressLine},{" "}
                          {(o.shipping_address as any).city}
                        </span>
                        {(o.shipping_address as any).phone && (
                          <span>📞 {(o.shipping_address as any).phone}</span>
                        )}
                        <span>Payment: {o.payment_method || "—"}</span>
                      </div>
                    )}

                    {items.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">
                        No items found for this order.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left p-3 font-medium">
                              Product
                            </th>
                            <th className="text-left p-3 font-medium">
                              Vendor
                            </th>
                            <th className="text-left p-3 font-medium">Qty</th>
                            <th className="text-left p-3 font-medium">
                              Price
                            </th>
                            <th className="text-left p-3 font-medium">
                              Commission
                            </th>
                            <th className="text-left p-3 font-medium">
                              Item Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item: any) => (
                            <tr
                              key={item.id}
                              className="border-t border-border"
                            >
                              <td className="p-3 font-medium">
                                {(item.products as any)?.name || "—"}
                              </td>
                              <td className="p-3 text-muted-foreground text-xs">
                                {(item.vendors as any)?.store_name || "—"}
                              </td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3">
                                KSh{" "}
                                {(
                                  Number(item.price) * item.quantity
                                ).toLocaleString()}
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                KSh{" "}
                                {Number(
                                  item.commission_amount
                                ).toLocaleString()}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(
                                    item.status
                                  )}`}
                                >
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
