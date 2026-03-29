import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown, User, Monitor, Shirt, Home, Heart, Dumbbell, Smartphone, BookOpen, Car } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { LucideIcon } from "lucide-react";

export const MENU_CATEGORIES: { name: string; icon: LucideIcon; slug: string; children: any[] }[] = [
  {
    name: "Electronics", icon: Monitor, slug: "electronics",
    children: [
      { name: "Mobile Phones", slug: "mobile-phones", children: [
        { name: "Smartphones", slug: "smartphones" }, { name: "Feature Phones", slug: "feature-phones" }
      ]},
      { name: "Tablets", slug: "tablets", children: [] },
      { name: "Laptops", slug: "laptops", children: [] },
      { name: "Desktop Computers", slug: "desktop-computers", children: [] },
      { name: "Monitors", slug: "monitors", children: [] },
      { name: "Printers & Scanners", slug: "printers-scanners", children: [] },
      { name: "Computer Accessories", slug: "computer-accessories", children: [
        { name: "Keyboards", slug: "keyboards" }, { name: "Mouse", slug: "mouse" },
        { name: "Flash Disks", slug: "flash-disks" }, { name: "External Hard Drives", slug: "external-hard-drives" }
      ]},
      { name: "Networking", slug: "networking", children: [
        { name: "Routers", slug: "routers" }, { name: "Modems", slug: "modems" }, { name: "Range Extenders", slug: "range-extenders" }
      ]},
      { name: "TV & Video", slug: "tv-video", children: [
        { name: "Smart TVs", slug: "smart-tvs" }, { name: "LED TVs", slug: "led-tvs" }, { name: "TV Accessories", slug: "tv-accessories" }
      ]},
      { name: "Audio", slug: "audio", children: [
        { name: "Headphones", slug: "headphones" }, { name: "Earbuds", slug: "earbuds" },
        { name: "Bluetooth Speakers", slug: "bluetooth-speakers" }, { name: "Home Theater Systems", slug: "home-theater-systems" }
      ]},
      { name: "Cameras", slug: "cameras", children: [
        { name: "Digital Cameras", slug: "digital-cameras" }, { name: "CCTV Cameras", slug: "cctv-cameras" }, { name: "Accessories", slug: "camera-accessories" }
      ]},
      { name: "Gaming", slug: "gaming", children: [
        { name: "Consoles (PS, Xbox)", slug: "consoles" }, { name: "Gaming Accessories", slug: "gaming-accessories" }
      ]},
      { name: "Power", slug: "power", children: [
        { name: "Power Banks", slug: "power-banks" }, { name: "Chargers", slug: "chargers" }, { name: "Extension Cables", slug: "extension-cables" }
      ]},
    ],
  },
  {
    name: "Fashion", icon: Shirt, slug: "fashion",
    children: [
      { name: "Men", slug: "men", children: [
        { name: "Shirts", slug: "shirts" }, { name: "T-Shirts", slug: "tshirts" }, { name: "Jeans", slug: "jeans-men" },
        { name: "Suits", slug: "suits" }, { name: "Jackets", slug: "jackets" },
        { name: "Sneakers", slug: "sneakers" }, { name: "Official Shoes", slug: "official-shoes" },
        { name: "Watches", slug: "watches" }, { name: "Belts", slug: "belts" }, { name: "Wallets", slug: "wallets" }
      ]},
      { name: "Women", slug: "women", children: [
        { name: "Dresses", slug: "dresses" }, { name: "Tops & Blouses", slug: "tops-blouses" },
        { name: "Skirts", slug: "skirts" }, { name: "Jeans & Trousers", slug: "jeans-women" },
        { name: "Shoes", slug: "women-shoes" }, { name: "Handbags", slug: "handbags" }, { name: "Jewelry", slug: "jewelry" }
      ]},
      { name: "Kids", slug: "kids", children: [
        { name: "Boys Clothing", slug: "boys-clothing" }, { name: "Girls Clothing", slug: "girls-clothing" },
        { name: "School Wear", slug: "school-wear" }, { name: "Shoes", slug: "kids-shoes" }
      ]},
      { name: "Others", slug: "fashion-others", children: [
        { name: "Bags & Luggage", slug: "bags-luggage" }, { name: "Fashion Accessories", slug: "fashion-accessories" }, { name: "Traditional Wear", slug: "traditional-wear" }
      ]},
    ],
  },
  {
    name: "Home & Garden", icon: Home, slug: "home-garden",
    children: [
      { name: "Furniture", slug: "furniture", children: [
        { name: "Sofas", slug: "sofas" }, { name: "Beds", slug: "beds" }, { name: "Tables", slug: "tables" }
      ]},
      { name: "Home Decor", slug: "home-decor", children: [
        { name: "Curtains", slug: "curtains" }, { name: "Carpets", slug: "carpets" }, { name: "Wall Art", slug: "wall-art" }
      ]},
      { name: "Kitchen & Dining", slug: "kitchen-dining", children: [
        { name: "Cookware", slug: "cookware" }, { name: "Kitchen Appliances", slug: "kitchen-appliances" },
        { name: "Cutlery", slug: "cutlery" }, { name: "Storage", slug: "kitchen-storage" }
      ]},
      { name: "Appliances", slug: "appliances", children: [
        { name: "Refrigerators", slug: "refrigerators" }, { name: "Microwaves", slug: "microwaves" },
        { name: "Washing Machines", slug: "washing-machines" }, { name: "Cookers", slug: "cookers" }
      ]},
      { name: "Garden", slug: "garden", children: [
        { name: "Gardening Tools", slug: "gardening-tools" }, { name: "Plants & Seeds", slug: "plants-seeds" }, { name: "Outdoor Furniture", slug: "outdoor-furniture" }
      ]},
      { name: "Cleaning", slug: "cleaning", children: [
        { name: "Cleaning Supplies", slug: "cleaning-supplies" }, { name: "Vacuum Cleaners", slug: "vacuum-cleaners" }
      ]},
    ],
  },
  {
    name: "Health & Beauty", icon: Heart, slug: "health-beauty",
    children: [
      { name: "Beauty", slug: "beauty", children: [
        { name: "Makeup", slug: "makeup" }, { name: "Skincare", slug: "skincare" },
        { name: "Haircare", slug: "haircare" }, { name: "Fragrances", slug: "fragrances" }
      ]},
      { name: "Personal Care", slug: "personal-care", children: [
        { name: "Bath & Body", slug: "bath-body" }, { name: "Oral Care", slug: "oral-care" }, { name: "Feminine Care", slug: "feminine-care" }
      ]},
      { name: "Health", slug: "health", children: [
        { name: "Supplements", slug: "supplements" }, { name: "Medical Equipment", slug: "medical-equipment" }, { name: "First Aid", slug: "first-aid" }
      ]},
      { name: "Hair", slug: "hair", children: [
        { name: "Wigs & Extensions", slug: "wigs-extensions" }, { name: "Hair Tools", slug: "hair-tools" }
      ]},
    ],
  },
  {
    name: "Sports", icon: Dumbbell, slug: "sports",
    children: [
      { name: "Fitness Equipment", slug: "fitness-equipment", children: [
        { name: "Dumbbells", slug: "dumbbells" }, { name: "Treadmills", slug: "treadmills" }
      ]},
      { name: "Outdoor Sports", slug: "outdoor-sports", children: [
        { name: "Football", slug: "football" }, { name: "Basketball", slug: "basketball" }
      ]},
      { name: "Gym Accessories", slug: "gym-accessories", children: [] },
      { name: "Cycling", slug: "cycling", children: [] },
      { name: "Camping & Hiking", slug: "camping-hiking", children: [] },
      { name: "Sportswear", slug: "sportswear", children: [] },
      { name: "Sports Shoes", slug: "sports-shoes", children: [] },
    ],
  },
  {
    name: "Phones & Tablets", icon: Smartphone, slug: "phones-tablets",
    children: [
      { name: "Smartphones", slug: "smartphones-pt", children: [] },
      { name: "Feature Phones", slug: "feature-phones-pt", children: [] },
      { name: "Tablets", slug: "tablets-pt", children: [] },
      { name: "Phone Accessories", slug: "phone-accessories", children: [
        { name: "Cases", slug: "phone-cases" }, { name: "Screen Protectors", slug: "screen-protectors" }, { name: "Chargers", slug: "phone-chargers" }
      ]},
      { name: "Smartwatches", slug: "smartwatches", children: [] },
      { name: "Phone Parts", slug: "phone-parts", children: [] },
      { name: "Refurbished Phones", slug: "refurbished-phones", children: [] },
    ],
  },
  {
    name: "Automotive", icon: Car, slug: "automotive",
    children: [
      { name: "Car Parts", slug: "car-parts", children: [] },
      { name: "Motorcycle Parts", slug: "motorcycle-parts", children: [] },
      { name: "Car Electronics", slug: "car-electronics", children: [] },
      { name: "Tires & Wheels", slug: "tires-wheels", children: [] },
      { name: "Interior Accessories", slug: "interior-accessories", children: [] },
      { name: "Exterior Accessories", slug: "exterior-accessories", children: [] },
      { name: "Oils & Fluids", slug: "oils-fluids", children: [] },
      { name: "Tools & Equipment", slug: "tools-equipment", children: [] },
    ],
  },
  {
    name: "Books", icon: BookOpen, slug: "books",
    children: [
      { name: "Fiction", slug: "fiction", children: [] },
      { name: "Non-Fiction", slug: "non-fiction", children: [] },
      { name: "Academic & Textbooks", slug: "academic-textbooks", children: [] },
      { name: "Children's Books", slug: "childrens-books", children: [] },
      { name: "Comics & Manga", slug: "comics-manga", children: [] },
      { name: "Self-Help & Motivation", slug: "self-help-motivation", children: [] },
      { name: "Religion & Spirituality", slug: "religion-spirituality", children: [] },
      { name: "Business & Finance", slug: "business-finance-books", children: [] },
      { name: "Science & Technology", slug: "science-technology-books", children: [] },
      { name: "Art & Photography", slug: "art-photography-books", children: [] },
    ],
  },
];

interface SidebarMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SidebarMenu = ({ open, onOpenChange }: SidebarMenuProps) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const { user, signOut, userRoles } = useAuth();

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
          {MENU_CATEGORIES.map((cat) => (
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
