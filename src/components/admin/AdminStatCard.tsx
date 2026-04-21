import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type AccentTone = "revenue" | "orders" | "vendors" | "warning" | "danger" | "info";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: AccentTone;
  delta?: { value: number; label?: string } | null;
  hint?: string;
}

const toneClasses: Record<AccentTone, { bar: string; iconBg: string; iconFg: string }> = {
  revenue: { bar: "bg-admin-revenue", iconBg: "bg-admin-revenue/10", iconFg: "text-admin-revenue" },
  orders: { bar: "bg-admin-orders", iconBg: "bg-admin-orders/10", iconFg: "text-admin-orders" },
  vendors: { bar: "bg-admin-vendors", iconBg: "bg-admin-vendors/10", iconFg: "text-admin-vendors" },
  warning: { bar: "bg-admin-warning", iconBg: "bg-admin-warning/10", iconFg: "text-admin-warning" },
  danger: { bar: "bg-admin-danger", iconBg: "bg-admin-danger/10", iconFg: "text-admin-danger" },
  info: { bar: "bg-admin-info", iconBg: "bg-admin-info/10", iconFg: "text-admin-info" },
};

export const AdminStatCard = ({ label, value, icon: Icon, tone = "info", delta, hint }: AdminStatCardProps) => {
  const t = toneClasses[tone];
  const deltaPositive = delta && delta.value > 0;
  const deltaNegative = delta && delta.value < 0;
  const DeltaIcon = deltaPositive ? TrendingUp : deltaNegative ? TrendingDown : Minus;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-admin-card shadow-admin-card hover:shadow-admin-card-hover transition-all">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", t.bar)} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", t.iconBg)}>
            <Icon className={cn("h-4 w-4", t.iconFg)} />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground leading-tight">{value}</p>
        {delta && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded",
                deltaPositive && "bg-success/10 text-success",
                deltaNegative && "bg-destructive/10 text-destructive",
                !deltaPositive && !deltaNegative && "bg-muted text-muted-foreground"
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {Math.abs(delta.value).toFixed(1)}%
            </span>
            {delta.label && <span className="text-[11px] text-muted-foreground">{delta.label}</span>}
          </div>
        )}
        {hint && !delta && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
};

export default AdminStatCard;
