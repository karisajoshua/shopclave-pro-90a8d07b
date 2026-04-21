import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AlertTriangle, Store, Wallet, CreditCard, Shield, ShoppingBag, PackageX, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Severity = "danger" | "warning" | "info" | "neutral";

interface ActionItem {
  label: string;
  count: number;
  to: string;
  icon: typeof Store;
  severity: Severity;
}

const sevClasses: Record<Severity, { ring: string; iconBg: string; iconFg: string; badge: string }> = {
  danger: { ring: "ring-admin-danger/30", iconBg: "bg-admin-danger/10", iconFg: "text-admin-danger", badge: "bg-admin-danger text-white" },
  warning: { ring: "ring-admin-warning/30", iconBg: "bg-admin-warning/10", iconFg: "text-admin-warning", badge: "bg-admin-warning text-white" },
  info: { ring: "ring-admin-info/20", iconBg: "bg-admin-info/10", iconFg: "text-admin-info", badge: "bg-admin-info text-white" },
  neutral: { ring: "ring-border", iconBg: "bg-muted", iconFg: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
};

export const ActionRequiredPanel = () => {
  const { data } = useQuery({
    queryKey: ["admin-action-required"],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [vendorsQ, withdrawalsQ, subsQ, disputesQ, oldOrdersQ, lowStockQ] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("vendor_subscription_payments").select("id", { count: "exact", head: true }).eq("status", "pending_verification"),
        (supabase as any).from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", oneDayAgo),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active").lt("stock", 5),
      ]);
      return {
        vendors: vendorsQ.count || 0,
        withdrawals: withdrawalsQ.count || 0,
        subs: subsQ.count || 0,
        disputes: disputesQ.count || 0,
        oldOrders: oldOrdersQ.count || 0,
        lowStock: lowStockQ.count || 0,
      };
    },
    refetchInterval: 60_000,
  });

  const items: ActionItem[] = [
    { label: "Open disputes", count: data?.disputes ?? 0, to: "/admin/evidence", icon: Shield, severity: (data?.disputes ?? 0) > 0 ? "danger" : "neutral" },
    { label: "Pending vendors", count: data?.vendors ?? 0, to: "/admin/vendors", icon: Store, severity: (data?.vendors ?? 0) > 0 ? "warning" : "neutral" },
    { label: "Withdrawals to review", count: data?.withdrawals ?? 0, to: "/admin/withdrawals", icon: Wallet, severity: (data?.withdrawals ?? 0) > 0 ? "warning" : "neutral" },
    { label: "Subscription payments", count: data?.subs ?? 0, to: "/admin/subscriptions", icon: CreditCard, severity: (data?.subs ?? 0) > 0 ? "warning" : "neutral" },
    { label: "Stale pending orders", count: data?.oldOrders ?? 0, to: "/admin/orders", icon: ShoppingBag, severity: (data?.oldOrders ?? 0) > 0 ? "warning" : "neutral" },
    { label: "Low-stock products", count: data?.lowStock ?? 0, to: "/admin/products", icon: PackageX, severity: (data?.lowStock ?? 0) > 0 ? "info" : "neutral" },
  ];

  const totalActions = items.reduce((s, i) => s + i.count, 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-admin-warning" />
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Action required</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalActions === 0 ? "All clear" : `${totalActions} item${totalActions === 1 ? "" : "s"} need attention`}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => {
          const sev = sevClasses[item.severity];
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "group relative rounded-xl border bg-admin-card p-3 shadow-admin-card hover:shadow-admin-card-hover transition-all ring-1",
                sev.ring,
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", sev.iconBg)}>
                  <item.icon className={cn("h-4 w-4", sev.iconFg)} />
                </div>
                {item.count > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", sev.badge)}>
                    {item.count}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-foreground leading-tight">{item.label}</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                Review <ChevronRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default ActionRequiredPanel;
