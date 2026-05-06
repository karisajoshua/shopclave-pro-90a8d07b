import { Home, Search, ShoppingCart, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useCart } from "@/contexts/CartContext";
import { useIsIOS } from "@/hooks/use-ios";

const MobileBottomNav = () => {
  const { items } = useCart();
  const isIOS = useIsIOS();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)] ${
        isIOS
          ? "ios-blur"
          : "bg-card border-t border-border"
      }`}
    >
      <div className={`flex items-center justify-around ${isIOS ? "h-16" : "h-14"}`}>
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
            className={`flex flex-col items-center justify-center gap-0.5 text-muted-foreground min-w-[3rem] min-h-[2.75rem] ${
              isIOS ? "ios-ease" : ""
            }`}
            activeClassName="text-primary"
          >
            <div className="relative">
              <item.icon className={isIOS ? "h-6 w-6" : "h-5 w-5"} strokeWidth={isIOS ? 2 : 2} />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </div>
            <span className={`font-medium ${isIOS ? "text-[10px] tracking-tight" : "text-[10px]"}`}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
