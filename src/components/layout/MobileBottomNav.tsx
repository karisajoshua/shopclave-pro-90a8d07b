import { Home, Search, ShoppingCart, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useCart } from "@/contexts/CartContext";

const MobileBottomNav = () => {
  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {[
          { to: "/", icon: Home, label: "Home" },
          { to: "/search", icon: Search, label: "Search" },
          { to: "/cart", icon: ShoppingCart, label: "Cart", badge: cartCount },
          { to: "/account", icon: User, label: "Account" },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground min-w-[3rem] min-h-[2.75rem]"
            activeClassName="text-primary"
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
