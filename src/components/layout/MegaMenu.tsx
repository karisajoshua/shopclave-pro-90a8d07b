import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown, User, Monitor, Shirt, Home, Heart, Dumbbell, Smartphone, BookOpen, Car, Tag, Footprints, Watch, Gem, Luggage, ShoppingBag, Scissors } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LucideIcon } from "lucide-react";

// Icons keyed by top-level category slug. Categories themselves come from the database.
const TOP_LEVEL_ICONS: Record<string, LucideIcon> = {
  electronics: Monitor,
  fashion: Shirt,
  "fashion-clothing": Shirt,
  shoes: Footprints,
  watches: Watch,
  jewelry: Gem,
  "travel-and-luggage": Luggage,
  "bags-and-accessories": ShoppingBag,
  "fabric-and-tailoring": Scissors,
  "home-garden": Home,
  "health-beauty": Heart,
  sports: Dumbbell,
  "phones-tablets": Smartphone,
  automotive: Car,
  books: BookOpen,
};

type CategoryRow = { id: string; name: string; slug: string; parent_id: string | null };
type MenuNode = { id: string; name: string; slug: string; children: MenuNode[] };

function buildTree(rows: CategoryRow[]): (MenuNode & { icon: LucideIcon })[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const r of rows) {
    const k = r.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(r);
  }
  const build = (parentId: string | null): MenuNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({ id: r.id, name: r.name, slug: r.slug, children: build(r.id) }));

  return build(null).map((n) => ({ ...n, icon: TOP_LEVEL_ICONS[n.slug] ?? Tag }));
}

interface SidebarMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SidebarMenu = ({ open, onOpenChange }: SidebarMenuProps) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const { user, signOut, userRoles } = useAuth();

  const { data: menuCategories = [] } = useQuery({
    queryKey: ["sidebar-menu-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id");
      if (error) throw error;
      return buildTree((data ?? []) as CategoryRow[]);
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleCat = (slug: string) => {
    setExpandedCat(expandedCat === slug ? null : slug);
    setExpandedSub(null);
  };

  const toggleSub = (slug: string) => {
    setExpandedSub(expandedSub === slug ? null : slug);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] sm:w-[360px] p-0 bg-card overflow-y-auto">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        {/* User greeting */}
        <div className="bg-[hsl(var(--nav-dark))] text-primary-foreground px-5 py-4 flex items-center gap-3">
          <User className="h-6 w-6" />
          <span className="font-semibold text-base">
            {user ? "Hello, welcome back" : "Hello, Sign In"}
          </span>
        </div>

        {/* Categories */}
        <div className="py-2">
          <p className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Shop by Category</p>
          {menuCategories.map((cat) => (
            <div key={cat.slug}>
              <button
                onClick={() => toggleCat(cat.slug)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <span className="flex items-center gap-2.5"><cat.icon className="h-4 w-4 text-muted-foreground" /> {cat.name}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedCat === cat.slug ? "rotate-180" : ""}`} />
              </button>
              {expandedCat === cat.slug && (
                <div className="bg-secondary/50">
                  {cat.children.map((sub) => (
                    <div key={sub.slug}>
                      {sub.children.length > 0 ? (
                        <>
                          <button
                            onClick={() => toggleSub(sub.slug)}
                            className="w-full flex items-center justify-between pl-10 pr-5 py-2.5 text-sm hover:bg-secondary transition-colors"
                          >
                            <span>{sub.name}</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedSub === sub.slug ? "rotate-90" : ""}`} />
                          </button>
                          {expandedSub === sub.slug && (
                            <div className="bg-secondary/80">
                              {sub.children.map((child) => (
                                <Link
                                  key={child.slug}
                                  to={`/search?category=${child.slug}`}
                                  className="block pl-14 pr-5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                  onClick={() => onOpenChange(false)}
                                >
                                  {child.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          to={`/search?category=${sub.slug}`}
                          className="block pl-10 pr-5 py-2.5 text-sm hover:bg-secondary transition-colors"
                          onClick={() => onOpenChange(false)}
                        >
                          {sub.name}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Account links */}
        <div className="border-t border-border py-2">
          <p className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Help & Settings</p>
          {user ? (
            <>
              <Link to="/account" className="block px-5 py-3 text-sm hover:bg-secondary" onClick={() => onOpenChange(false)}>Your Account</Link>
              {userRoles.includes("vendor") && (
                <Link to="/vendor/dashboard" className="block px-5 py-3 text-sm hover:bg-secondary" onClick={() => onOpenChange(false)}>Seller Hub</Link>
              )}
              {userRoles.includes("admin") && (
                <Link to="/admin" className="block px-5 py-3 text-sm hover:bg-secondary" onClick={() => onOpenChange(false)}>Admin Dashboard</Link>
              )}
              <button onClick={() => { signOut(); onOpenChange(false); }} className="block w-full text-left px-5 py-3 text-sm text-destructive hover:bg-secondary">Sign Out</button>
            </>
          ) : (
            <Link to="/auth" className="block px-5 py-3 text-sm font-medium text-primary hover:bg-secondary" onClick={() => onOpenChange(false)}>Sign In / Register</Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SidebarMenu;

export const MobileMegaMenu = ({ onNavigate }: { onNavigate?: () => void }) => null;
