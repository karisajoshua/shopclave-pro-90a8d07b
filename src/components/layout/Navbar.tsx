import { Link } from "react-router-dom";
import { ShoppingCart, Search, Menu, MapPin, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { useTranslation } from "@/contexts/TranslationContext";
import SidebarMenu from "./MegaMenu";
import SearchSuggestions from "./SearchSuggestions";
import barakazLogo from "@/assets/barakaz-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const { country, languages } = useLocale();
  const { language, setLanguage, t } = useTranslation();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSuggestionsOpen(false);
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Main dark navbar */}
        <nav className="bg-[hsl(var(--nav-dark))] text-primary-foreground">
          {/* === MOBILE TOP ROW === */}
          <div className="md:hidden flex items-center justify-between px-3 h-12">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)}>
                <Menu className="h-6 w-6" />
              </button>
              <Link to="/">
                <img
                  src={barakazLogo}
                  alt="Barakaz"
                  className="h-12 w-auto brightness-0 invert"
                />
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={user ? "/account" : "/auth"}
                className="flex items-center gap-1 text-xs px-1 py-1"
              >
                <span className="font-semibold text-sm">
                  {user ? t("nav.helloWelcome") : <>Sign in <span className="text-[10px]">›</span></>}
                </span>
              </Link>
              <Link to={user ? "/account" : "/auth"} className="p-1">
                <User className="h-5 w-5" />
              </Link>
              <Link to="/cart" className="relative p-1">
                <ShoppingCart className="h-6 w-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[hsl(var(--marketplace-orange))] text-xs font-extrabold">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* === MOBILE SEARCH ROW === */}
          <div className="md:hidden px-3 pb-2">
            <div className="flex w-full relative">
              <Input
                placeholder={t("nav.search")}
                className="h-10 rounded-l-md rounded-r-none bg-white text-foreground border-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketplace-orange))] flex-1"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSuggestionsOpen(true); }}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="bg-[hsl(var(--marketplace-orange-hover))] hover:bg-[hsl(var(--marketplace-orange))] px-3 rounded-r-md flex items-center justify-center"
              >
                <Search className="h-5 w-5 text-primary-foreground" />
              </button>
              <SearchSuggestions query={searchQuery} visible={suggestionsOpen} onClose={() => setSuggestionsOpen(false)} />
            </div>
          </div>

          {/* === DESKTOP ROW (unchanged) === */}
          <div className="container hidden md:flex items-center gap-2 md:gap-4 h-14 md:h-16">
            {/* Logo */}
            <Link to="/" className="shrink-0">
              <img
                src={barakazLogo}
                alt="Barakaz"
                className="h-14 md:h-16 w-auto brightness-0 invert"
              />
            </Link>

            {/* Deliver to */}
            <div className="flex items-center gap-1 text-xs shrink-0 cursor-default hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded px-1 py-1">
              <MapPin className="h-4 w-4 text-primary-foreground/70" />
              <div className="leading-tight">
                <span className="text-primary-foreground/70 block">{t("nav.deliverTo")}</span>
                <span className="font-bold text-sm">{country.name}</span>
              </div>
            </div>

            {/* Search bar */}
            <div className="flex-1 flex">
              <div className="relative w-full flex">
                <Input
                  placeholder={t("nav.search")}
                  className="h-10 rounded-l-md rounded-r-none bg-white text-foreground border-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketplace-orange))] pr-10"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSuggestionsOpen(true); }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="bg-[hsl(var(--marketplace-orange-hover))] hover:bg-[hsl(var(--marketplace-orange))] px-3 rounded-r-md flex items-center justify-center"
                >
                  <Search className="h-5 w-5 text-primary-foreground" />
                </button>
                <SearchSuggestions query={searchQuery} visible={suggestionsOpen} onClose={() => setSuggestionsOpen(false)} />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Language */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded px-2 py-1">
                    <Globe className="h-4 w-4" />
                    <span className="font-bold text-sm">{language}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px] max-h-[400px] overflow-y-auto">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? "font-bold" : ""}
                    >
                      {lang.label} ({lang.code})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Account */}
              <Link
                to={user ? "/account" : "/auth"}
                className="flex flex-col text-xs hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded px-2 py-1"
              >
                <span className="text-primary-foreground/70 text-[11px]">
                  {user ? t("nav.helloWelcome") : t("nav.hello")}
                </span>
                <span className="font-bold text-sm leading-tight">{t("nav.accountLists")}</span>
              </Link>

              {/* Cart */}
              <Link to="/cart" className="relative flex items-center gap-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded px-2 py-1">
                <div className="relative">
                  <ShoppingCart className="h-7 w-7" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[hsl(var(--marketplace-orange))] text-xs font-extrabold">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold">{t("nav.cart")}</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* === MOBILE QUICK LINKS === */}
        <div className="md:hidden bg-[hsl(var(--nav-secondary))] text-primary-foreground">
          <div className="flex items-center gap-0 h-9 text-xs overflow-x-auto scrollbar-hide px-1">
            <Link to="/search?deals=1" className="px-3 py-1 shrink-0 whitespace-nowrap">{t("nav.todaysDeals")}</Link>
            <Link to="/vendor/register" className="px-3 py-1 shrink-0 whitespace-nowrap">{t("nav.sellOn")}</Link>
            <Link to="/search?category=electronics" className="px-3 py-1 shrink-0 whitespace-nowrap">{t("nav.electronics")}</Link>
            <Link to="/search?category=fashion" className="px-3 py-1 shrink-0 whitespace-nowrap">{t("nav.fashion")}</Link>
            <Link to="/search?category=home-garden" className="px-3 py-1 shrink-0 whitespace-nowrap">{t("nav.homeGarden")}</Link>
            <Link to="/search?category=health-beauty" className="px-3 py-1 shrink-0 whitespace-nowrap">{t("nav.healthBeauty")}</Link>
            <Link to="/search?category=sports" className="px-3 py-1 shrink-0 whitespace-nowrap">{t("nav.sports")}</Link>
          </div>
        </div>

        {/* === MOBILE LOCATION BAR === */}
        <div className="md:hidden bg-background border-b border-border">
          <div className="flex items-center gap-1.5 px-3 h-9 text-xs text-foreground">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("nav.deliverTo")}</span>
            <span className="font-bold text-sm">{country.name}</span>
          </div>
        </div>

        {/* Secondary nav bar — desktop only */}
        <div className="hidden md:block bg-[hsl(var(--nav-secondary))] text-primary-foreground">
          <div className="container flex items-center gap-0 h-10 text-sm overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1 font-bold px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0"
            >
              <Menu className="h-5 w-5" />
              <span>{t("nav.all")}</span>
            </button>
            <Link to="/search?deals=1" className="px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0 whitespace-nowrap">{t("nav.todaysDeals")}</Link>
            <Link to="/vendor/register" className="px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0 whitespace-nowrap">{t("nav.sellOn")}</Link>
            <Link to="/search?category=electronics" className="px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0 whitespace-nowrap">{t("nav.electronics")}</Link>
            <Link to="/search?category=fashion" className="px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0 whitespace-nowrap">{t("nav.fashion")}</Link>
            <Link to="/search?category=home-garden" className="px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0 whitespace-nowrap">{t("nav.homeGarden")}</Link>
            <Link to="/search?category=health-beauty" className="px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0 whitespace-nowrap">{t("nav.healthBeauty")}</Link>
            <Link to="/search?category=sports" className="px-3 py-1 hover:outline hover:outline-1 hover:outline-primary-foreground/50 rounded shrink-0 whitespace-nowrap hidden lg:inline">{t("nav.sports")}</Link>
          </div>
        </div>
      </header>

      <SidebarMenu open={sidebarOpen} onOpenChange={setSidebarOpen} />
    </>
  );
};

export default Navbar;
