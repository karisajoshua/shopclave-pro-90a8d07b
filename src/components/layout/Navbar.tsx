import { Link } from "react-router-dom";
import { ShoppingCart, Search, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import DesktopMegaMenu, { MobileMegaMenu } from "./MegaMenu";
import barakazLogo from "@/assets/barakaz-logo.png";

const Navbar = () => {
  const { user, signOut, userRoles } = useAuth();
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isVendor = userRoles.includes("vendor");
  const isAdmin = userRoles.includes("admin");

  return (
    <header className="sticky top-0 z-50">
      {/* Top banner */}
      <div className="bg-marketplace-banner text-primary-foreground text-xs py-1.5 text-center tracking-wide">
        Free delivery on orders over KSh 2,000 | <span className="font-semibold">Shop now</span>
      </div>

      {/* Main nav */}
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="container flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img
              src={barakazLogo}
              alt="Barakaz"
              className="h-9 w-auto mix-blend-multiply dark:mix-blend-normal dark:brightness-0 dark:invert"
            />
          </Link>

          {/* Search - desktop */}
          <div className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Input
                placeholder="Search products, brands and categories..."
                className="pr-10 bg-secondary border-none h-10 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/account">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Account</span>
                  </Button>
                </Link>
                {isVendor && (
                  <Link to="/vendor/dashboard">
                    <Button variant="ghost" size="sm" className="text-sm">Seller Hub</Button>
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="text-sm">Admin</Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={signOut} className="text-sm">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Sign In</span>
                  </Button>
                </Link>
              </div>
            )}

            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Desktop Mega Menu */}
        <DesktopMegaMenu />

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-card border-t border-border max-h-[80vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 space-y-3">
              <Input
                placeholder="Search products..."
                className="bg-secondary border-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                    setMobileOpen(false);
                  }
                }}
              />

              <MobileMegaMenu onNavigate={() => setMobileOpen(false)} />

              <div className="border-t border-border pt-3 space-y-2">
                {user ? (
                  <>
                    <Link to="/account" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>My Account</Link>
                    {isVendor && <Link to="/vendor/dashboard" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Seller Hub</Link>}
                    {isAdmin && <Link to="/admin" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Admin</Link>}
                    <button onClick={() => { signOut(); setMobileOpen(false); }} className="block py-2 text-sm text-destructive">Sign Out</button>
                  </>
                ) : (
                  <Link to="/auth" className="block py-2 text-sm font-medium text-primary" onClick={() => setMobileOpen(false)}>Sign In / Register</Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
