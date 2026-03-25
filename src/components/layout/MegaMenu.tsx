import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";

type SubCategory = {
  name: string;
  slug: string;
  children?: { name: string; slug: string }[];
};

type TopCategory = {
  name: string;
  slug: string;
  emoji: string;
  subs: SubCategory[];
};

const MEGA_MENU_DATA: TopCategory[] = [
  {
    name: "Electronics",
    slug: "electronics",
    emoji: "💻",
    subs: [
      { name: "Mobile Phones", slug: "mobile-phones", children: [{ name: "Smartphones", slug: "smartphones" }, { name: "Feature Phones", slug: "feature-phones" }] },
      { name: "Tablets", slug: "tablets" },
      { name: "Laptops", slug: "laptops" },
      { name: "Desktop Computers", slug: "desktop-computers" },
      { name: "Monitors", slug: "monitors" },
      { name: "Printers & Scanners", slug: "printers-scanners" },
      { name: "Computer Accessories", slug: "computer-accessories", children: [{ name: "Keyboards", slug: "keyboards" }, { name: "Mouse", slug: "mouse" }, { name: "Flash Disks", slug: "flash-disks" }, { name: "External Hard Drives", slug: "external-hard-drives" }] },
      { name: "Networking", slug: "networking", children: [{ name: "Routers", slug: "routers" }, { name: "Modems", slug: "modems" }, { name: "Range Extenders", slug: "range-extenders" }] },
      { name: "TV & Video", slug: "tv-video", children: [{ name: "Smart TVs", slug: "smart-tvs" }, { name: "LED TVs", slug: "led-tvs" }, { name: "TV Accessories", slug: "tv-accessories" }] },
      { name: "Audio", slug: "audio", children: [{ name: "Headphones", slug: "headphones" }, { name: "Earbuds", slug: "earbuds" }, { name: "Bluetooth Speakers", slug: "bluetooth-speakers" }, { name: "Home Theater Systems", slug: "home-theater-systems" }] },
      { name: "Cameras", slug: "cameras", children: [{ name: "Digital Cameras", slug: "digital-cameras" }, { name: "CCTV Cameras", slug: "cctv-cameras" }, { name: "Accessories", slug: "camera-accessories" }] },
      { name: "Gaming", slug: "gaming", children: [{ name: "Consoles (PS, Xbox)", slug: "consoles" }, { name: "Gaming Accessories", slug: "gaming-accessories" }] },
      { name: "Power", slug: "power", children: [{ name: "Power Banks", slug: "power-banks" }, { name: "Chargers", slug: "chargers" }, { name: "Extension Cables", slug: "extension-cables" }] },
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    emoji: "👗",
    subs: [
      { name: "Men", slug: "men", children: [{ name: "Shirts", slug: "mens-shirts" }, { name: "T-Shirts", slug: "mens-tshirts" }, { name: "Jeans", slug: "mens-jeans" }, { name: "Suits", slug: "mens-suits" }, { name: "Jackets", slug: "mens-jackets" }] },
      { name: "Men's Shoes", slug: "mens-shoes", children: [{ name: "Sneakers", slug: "mens-sneakers" }, { name: "Official Shoes", slug: "mens-official-shoes" }, { name: "Sandals", slug: "mens-sandals" }] },
      { name: "Men's Accessories", slug: "mens-accessories", children: [{ name: "Watches", slug: "mens-watches" }, { name: "Belts", slug: "mens-belts" }, { name: "Wallets", slug: "mens-wallets" }] },
      { name: "Women", slug: "women", children: [{ name: "Dresses", slug: "womens-dresses" }, { name: "Tops & Blouses", slug: "womens-tops" }, { name: "Skirts", slug: "womens-skirts" }, { name: "Jeans & Trousers", slug: "womens-jeans" }] },
      { name: "Women's Shoes", slug: "womens-shoes" },
      { name: "Handbags", slug: "handbags" },
      { name: "Jewelry", slug: "jewelry" },
      { name: "Kids", slug: "kids", children: [{ name: "Boys Clothing", slug: "boys-clothing" }, { name: "Girls Clothing", slug: "girls-clothing" }, { name: "School Wear", slug: "school-wear" }, { name: "Kids Shoes", slug: "kids-shoes" }] },
      { name: "Bags & Luggage", slug: "bags-luggage" },
      { name: "Traditional Wear", slug: "traditional-wear" },
    ],
  },
  {
    name: "Home & Garden",
    slug: "home-garden",
    emoji: "🏡",
    subs: [
      { name: "Furniture", slug: "furniture", children: [{ name: "Sofas", slug: "sofas" }, { name: "Beds", slug: "beds" }, { name: "Tables", slug: "tables" }] },
      { name: "Home Decor", slug: "home-decor", children: [{ name: "Curtains", slug: "curtains" }, { name: "Carpets", slug: "carpets" }, { name: "Wall Art", slug: "wall-art" }] },
      { name: "Kitchen & Dining", slug: "kitchen-dining", children: [{ name: "Cookware", slug: "cookware" }, { name: "Kitchen Appliances", slug: "kitchen-appliances" }, { name: "Cutlery", slug: "cutlery" }, { name: "Storage", slug: "kitchen-storage" }] },
      { name: "Appliances", slug: "appliances", children: [{ name: "Refrigerators", slug: "refrigerators" }, { name: "Microwaves", slug: "microwaves" }, { name: "Washing Machines", slug: "washing-machines" }, { name: "Cookers", slug: "cookers" }] },
      { name: "Garden", slug: "garden", children: [{ name: "Gardening Tools", slug: "gardening-tools" }, { name: "Plants & Seeds", slug: "plants-seeds" }, { name: "Outdoor Furniture", slug: "outdoor-furniture" }] },
      { name: "Cleaning", slug: "cleaning", children: [{ name: "Cleaning Supplies", slug: "cleaning-supplies" }, { name: "Vacuum Cleaners", slug: "vacuum-cleaners" }] },
    ],
  },
  {
    name: "Health & Beauty",
    slug: "health-beauty",
    emoji: "💄",
    subs: [
      { name: "Beauty", slug: "beauty", children: [{ name: "Makeup", slug: "makeup" }, { name: "Skincare", slug: "skincare" }, { name: "Haircare", slug: "haircare" }, { name: "Fragrances", slug: "fragrances" }] },
      { name: "Personal Care", slug: "personal-care", children: [{ name: "Bath & Body", slug: "bath-body" }, { name: "Oral Care", slug: "oral-care" }, { name: "Feminine Care", slug: "feminine-care" }] },
      { name: "Health", slug: "health", children: [{ name: "Supplements", slug: "supplements" }, { name: "Medical Equipment", slug: "medical-equipment" }, { name: "First Aid", slug: "first-aid" }] },
      { name: "Hair", slug: "hair", children: [{ name: "Wigs & Extensions", slug: "wigs-extensions" }, { name: "Hair Tools", slug: "hair-tools" }] },
    ],
  },
  {
    name: "Sports",
    slug: "sports",
    emoji: "🏀",
    subs: [
      { name: "Fitness Equipment", slug: "fitness-equipment", children: [{ name: "Dumbbells", slug: "dumbbells" }, { name: "Treadmills", slug: "treadmills" }] },
      { name: "Outdoor Sports", slug: "outdoor-sports", children: [{ name: "Football", slug: "football" }, { name: "Basketball", slug: "basketball" }] },
      { name: "Gym Accessories", slug: "gym-accessories" },
      { name: "Cycling", slug: "cycling" },
      { name: "Camping & Hiking", slug: "camping-hiking" },
      { name: "Sportswear", slug: "sportswear" },
      { name: "Sports Shoes", slug: "sports-shoes" },
    ],
  },
  {
    name: "Phones & Tablets",
    slug: "phones-tablets",
    emoji: "📱",
    subs: [
      { name: "Smartphones", slug: "smartphones-pt" },
      { name: "Feature Phones", slug: "feature-phones-pt" },
      { name: "Tablets", slug: "tablets-pt" },
      { name: "Phone Accessories", slug: "phone-accessories", children: [{ name: "Cases", slug: "phone-cases" }, { name: "Screen Protectors", slug: "screen-protectors" }, { name: "Chargers", slug: "phone-chargers" }] },
      { name: "Smartwatches", slug: "smartwatches" },
      { name: "Phone Parts", slug: "phone-parts" },
      { name: "Refurbished Phones", slug: "refurbished-phones" },
    ],
  },
];

/* ─── Desktop Mega Menu ─── */
const DesktopMegaMenu = () => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="hidden md:block bg-primary relative">
      <div className="container flex items-center gap-0 h-10 text-sm text-primary-foreground">
        {MEGA_MENU_DATA.map((cat, idx) => (
          <div
            key={cat.slug}
            className="relative"
            onMouseEnter={() => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <Link
              to={`/category/${cat.slug}`}
              className="flex items-center gap-1 px-3 h-10 hover:bg-primary-foreground/10 transition-colors font-medium whitespace-nowrap"
            >
              <span className="text-xs">{cat.emoji}</span> {cat.name}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Link>

            {activeIdx === idx && (
              <div
                className="absolute left-0 top-10 bg-card border border-border rounded-lg shadow-xl z-50 p-6 min-w-[480px] max-w-[640px] animate-in fade-in-0 zoom-in-95 duration-150"
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  {cat.subs.map((sub) => (
                    <div key={sub.slug}>
                      <Link
                        to={`/category/${sub.slug}`}
                        className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                      >
                        {sub.name}
                      </Link>
                      {sub.children && (
                        <ul className="mt-1.5 space-y-1">
                          {sub.children.map((child) => (
                            <li key={child.slug}>
                              <Link
                                to={`/category/${child.slug}`}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Mobile Mega Menu (Accordion) ─── */
export const MobileMegaMenu = ({ onNavigate }: { onNavigate: () => void }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [openSubIdx, setOpenSubIdx] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {MEGA_MENU_DATA.map((cat, idx) => (
        <div key={cat.slug}>
          <button
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            className="w-full flex items-center justify-between py-2.5 px-1 text-sm font-medium text-foreground"
          >
            <span>{cat.emoji} {cat.name}</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${openIdx === idx ? "rotate-90" : ""}`} />
          </button>
          {openIdx === idx && (
            <div className="pl-4 pb-2 space-y-1 animate-in slide-in-from-top-2 duration-150">
              <Link
                to={`/category/${cat.slug}`}
                onClick={onNavigate}
                className="block py-1.5 text-xs font-semibold text-primary"
              >
                View All {cat.name}
              </Link>
              {cat.subs.map((sub) => (
                <div key={sub.slug}>
                  {sub.children ? (
                    <>
                      <button
                        onClick={() => setOpenSubIdx(openSubIdx === sub.slug ? null : sub.slug)}
                        className="w-full flex items-center justify-between py-1.5 text-sm text-foreground"
                      >
                        <span>{sub.name}</span>
                        <ChevronRight className={`h-3 w-3 transition-transform ${openSubIdx === sub.slug ? "rotate-90" : ""}`} />
                      </button>
                      {openSubIdx === sub.slug && (
                        <div className="pl-4 space-y-1 animate-in slide-in-from-top-1 duration-100">
                          {sub.children.map((child) => (
                            <Link
                              key={child.slug}
                              to={`/category/${child.slug}`}
                              onClick={onNavigate}
                              className="block py-1 text-xs text-muted-foreground hover:text-primary"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={`/category/${sub.slug}`}
                      onClick={onNavigate}
                      className="block py-1.5 text-sm text-foreground hover:text-primary"
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
  );
};

export default DesktopMegaMenu;
