import { Link } from "react-router-dom";
import { Store, Package, ShoppingBag, Wallet, Shield, FolderTree, Users, Settings } from "lucide-react";

const tiles = [
  { label: "Vendors", to: "/admin/vendors", icon: Store, tone: "text-admin-vendors", bg: "bg-admin-vendors/10" },
  { label: "Products", to: "/admin/products", icon: Package, tone: "text-admin-orders", bg: "bg-admin-orders/10" },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag, tone: "text-admin-info", bg: "bg-admin-info/10" },
  { label: "Withdrawals", to: "/admin/withdrawals", icon: Wallet, tone: "text-admin-revenue", bg: "bg-admin-revenue/10" },
  { label: "Evidence", to: "/admin/evidence", icon: Shield, tone: "text-admin-danger", bg: "bg-admin-danger/10" },
  { label: "Categories", to: "/admin/categories", icon: FolderTree, tone: "text-admin-warning", bg: "bg-admin-warning/10" },
  { label: "Users", to: "/admin/users", icon: Users, tone: "text-admin-info", bg: "bg-admin-info/10" },
  { label: "Settings", to: "/admin/settings", icon: Settings, tone: "text-muted-foreground", bg: "bg-muted" },
];

export const QuickNavGrid = () => (
  <section>
    <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Quick navigation</h2>
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          to={tile.to}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-admin-card shadow-admin-card hover:shadow-admin-card-hover transition-all hover:-translate-y-0.5"
        >
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tile.bg}`}>
            <tile.icon className={`h-5 w-5 ${tile.tone}`} />
          </div>
          <span className="text-[11px] font-medium text-foreground text-center leading-tight">{tile.label}</span>
        </Link>
      ))}
    </div>
  </section>
);

export default QuickNavGrid;
