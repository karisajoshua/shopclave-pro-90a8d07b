import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroBanner1 from "@/assets/hero-banner-1.png";
import heroBanner2 from "@/assets/hero-banner-2.png";
import heroBanner3 from "@/assets/hero-banner-3.png";
import heroBanner4 from "@/assets/hero-banner-4.png";
import catSmartphones from "@/assets/cat-smartphones.jpg";
import catLaptops from "@/assets/cat-laptops.jpg";
import catHeadphones from "@/assets/cat-headphones.jpg";
import catSmartTvs from "@/assets/cat-smart-tvs.jpg";
import catMensFashion from "@/assets/cat-mens-fashion.jpg";
import catWomensFashion from "@/assets/cat-womens-fashion.jpg";
import catKidsFashion from "@/assets/cat-kids-fashion.jpg";
import catShoes from "@/assets/cat-shoes.jpg";
import catFurniture from "@/assets/cat-furniture.jpg";
import catKitchen from "@/assets/cat-kitchen.jpg";
import catDecor from "@/assets/cat-decor.jpg";
import catAppliances from "@/assets/cat-appliances.jpg";
import catSkincare from "@/assets/cat-skincare.jpg";
import catMakeup from "@/assets/cat-makeup.jpg";
import catHaircare from "@/assets/cat-haircare.jpg";
import catSportswear from "@/assets/cat-sportswear.jpg";
import catFootball from "@/assets/cat-football.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import catSmartwatches from "@/assets/cat-smartwatches.jpg";
import catTablets from "@/assets/cat-tablets.jpg";
import catFragrances from "@/assets/cat-fragrances.jpg";
import catNewArrivals from "@/assets/cat-new-arrivals.jpg";
import catRegisterStore from "@/assets/cat-register-store.jpg";
import catAddProducts from "@/assets/cat-add-products.jpg";
import catManageOrders from "@/assets/cat-manage-orders.jpg";
import catGrowBusiness from "@/assets/cat-grow-business.jpg";
import catClearance from "@/assets/cat-clearance.jpg";
import catFlashSales from "@/assets/cat-flash-sales.jpg";
import catCycling from "@/assets/cat-cycling.jpg";

const HERO_SLIDES = [
  {
    image: heroBanner1,
    link: "/search?category=fashion",
  },
  {
    image: heroBanner2,
    link: "/search",
  },
  {
    image: heroBanner3,
    link: "/search?category=home-garden",
  },
  {
    image: heroBanner4,
    link: "/search?category=electronics",
  },
];

const CATEGORY_CARDS = [
  {
    title: "Top in Electronics",
    items: [
      { name: "Smartphones", slug: "smartphones", image: catSmartphones },
      { name: "Laptops", slug: "laptops", image: catLaptops },
      { name: "Headphones", slug: "headphones", image: catHeadphones },
      { name: "Smart TVs", slug: "smart-tvs", image: catSmartTvs },
    ],
    seeAllLink: "/search?category=electronics",
  },
  {
    title: "Fashion Deals",
    items: [
      { name: "Men's Fashion", slug: "men", image: catMensFashion },
      { name: "Women's Fashion", slug: "women", image: catWomensFashion },
      { name: "Kids' Fashion", slug: "kids", image: catKidsFashion },
      { name: "Shoes", slug: "sneakers", image: catShoes },
    ],
    seeAllLink: "/search?category=fashion",
  },
  {
    title: "Home Essentials",
    items: [
      { name: "Furniture", slug: "furniture", image: catFurniture },
      { name: "Kitchen", slug: "kitchen-dining", image: catKitchen },
      { name: "Decor", slug: "home-decor", image: catDecor },
      { name: "Appliances", slug: "appliances", image: catAppliances },
    ],
    seeAllLink: "/search?category=home-garden",
  },
  {
    title: "Health & Beauty",
    items: [
      { name: "Skincare", slug: "skincare", image: catSkincare },
      { name: "Makeup", slug: "makeup", image: catMakeup },
      { name: "Fragrances", slug: "fragrances", image: catFragrances },
      { name: "Hair Care", slug: "haircare", image: catHaircare },
    ],
    seeAllLink: "/search?category=health-beauty",
  },
  {
    title: "Sports & Fitness",
    items: [
      { name: "Fitness Gear", slug: "fitness-equipment", image: catNewArrivals },
      { name: "Football", slug: "football", image: catFootball },
      { name: "Sportswear", slug: "sportswear", image: catSportswear },
      { name: "Cycling", slug: "cycling", image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=200&q=80" },
    ],
    seeAllLink: "/search?category=sports",
  },
  {
    title: "Phones & Tablets",
    items: [
      { name: "Smartphones", slug: "smartphones-pt", image: catSmartphones },
      { name: "Tablets", slug: "tablets-pt", image: catTablets },
      { name: "Accessories", slug: "phone-accessories", image: catAccessories },
      { name: "Smartwatches", slug: "smartwatches", image: catSmartwatches },
    ],
    seeAllLink: "/search?category=phones-tablets",
  },
  {
    title: "Start Selling",
    items: [
      { name: "Register Store", slug: "_vendor_register", image: catRegisterStore },
      { name: "Add Products", slug: "_vendor_register", image: catAddProducts },
      { name: "Manage Orders", slug: "_vendor_register", image: catManageOrders },
      { name: "Grow Business", slug: "_vendor_register", image: catGrowBusiness },
    ],
    seeAllLink: "/vendor/register",
  },
  {
    title: "Deals of the Day",
    items: [
      { name: "Flash Sales", slug: "flash-sales", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
      { name: "Clearance", slug: "clearance", image: catClearance },
      { name: "Bundles", slug: "bundles", image: "https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=200&q=80" },
      { name: "New Arrivals", slug: "new-arrivals", image: catNewArrivals },
    ],
    seeAllLink: "/search",
  },
];

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div>
      {/* Hero carousel */}
      <section className="relative">
        <Link to={slide.link} className="block">
          <div className="w-full overflow-hidden">
            <img
              src={slide.image}
              alt="Hero banner"
              className="w-full h-[200px] sm:h-[300px] md:h-[400px] lg:h-[450px] object-cover transition-all duration-700"
            />
          </div>
        </Link>
        {/* Navigation dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentSlide ? "bg-primary-foreground" : "bg-primary-foreground/40"}`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card rounded-full p-2 shadow-lg"
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card rounded-full p-2 shadow-lg"
        >
          <ChevronRight className="h-6 w-6 text-foreground" />
        </button>
      </section>

      {/* Category cards grid */}
      <section className="container -mt-8 relative z-10 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORY_CARDS.map((card) => (
            <div key={card.title} className="bg-card rounded-lg p-5 shadow-sm">
              <h3 className="font-display font-bold text-lg text-foreground mb-4">{card.title}</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {card.items.map((item) => {
                  const to = item.slug.startsWith("_vendor") ? "/vendor/register" : `/search?category=${item.slug}`;
                  return (
                    <Link key={item.slug + item.name} to={to} className="group">
                      <div className="aspect-square rounded-md overflow-hidden bg-secondary mb-1.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors line-clamp-1">{item.name}</p>
                    </Link>
                  );
                })}
              </div>
              <Link to={card.seeAllLink} className="text-sm text-primary hover:underline font-medium">
                See all deals
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HeroBanner;
