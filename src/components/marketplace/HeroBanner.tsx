import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HERO_SLIDES = [
  {
    title: "Shop the Best Deals",
    subtitle: "Discover thousands of products from verified vendors",
    bg: "from-[hsl(24,95%,53%)] to-[hsl(24,95%,40%)]",
    cta: "Shop Now",
    link: "/search",
  },
  {
    title: "New Electronics Arrivals",
    subtitle: "Latest smartphones, laptops & gadgets at unbeatable prices",
    bg: "from-[hsl(220,20%,15%)] to-[hsl(220,20%,25%)]",
    cta: "Explore Electronics",
    link: "/search?category=electronics",
  },
  {
    title: "Fashion For Everyone",
    subtitle: "Trending styles for men, women & kids",
    bg: "from-[hsl(340,60%,45%)] to-[hsl(340,60%,35%)]",
    cta: "Shop Fashion",
    link: "/search?category=fashion",
  },
];

const CATEGORY_CARDS = [
  {
    title: "Top in Electronics",
    items: [
      { name: "Smartphones", slug: "smartphones", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&q=80" },
      { name: "Laptops", slug: "laptops", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&q=80" },
      { name: "Headphones", slug: "headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80" },
      { name: "Smart TVs", slug: "smart-tvs", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&q=80" },
    ],
    seeAllLink: "/search?category=electronics",
  },
  {
    title: "Fashion Deals",
    items: [
      { name: "Men's Fashion", slug: "men", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" },
      { name: "Women's Fashion", slug: "women", image: "https://images.unsplash.com/photo-1487222477894-f702e4571b60?w=200&q=80" },
      { name: "Kids' Fashion", slug: "kids", image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=200&q=80" },
      { name: "Shoes", slug: "sneakers", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80" },
    ],
    seeAllLink: "/search?category=fashion",
  },
  {
    title: "Home Essentials",
    items: [
      { name: "Furniture", slug: "furniture", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&q=80" },
      { name: "Kitchen", slug: "kitchen-dining", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&q=80" },
      { name: "Decor", slug: "home-decor", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&q=80" },
      { name: "Appliances", slug: "appliances", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&q=80" },
    ],
    seeAllLink: "/search?category=home-garden",
  },
  {
    title: "Health & Beauty",
    items: [
      { name: "Skincare", slug: "skincare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&q=80" },
      { name: "Makeup", slug: "makeup", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80" },
      { name: "Fragrances", slug: "fragrances", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&q=80" },
      { name: "Hair Care", slug: "haircare", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&q=80" },
    ],
    seeAllLink: "/search?category=health-beauty",
  },
  {
    title: "Sports & Fitness",
    items: [
      { name: "Fitness Gear", slug: "fitness-equipment", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80" },
      { name: "Football", slug: "football", image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&q=80" },
      { name: "Sportswear", slug: "sportswear", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80" },
      { name: "Cycling", slug: "cycling", image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=200&q=80" },
    ],
    seeAllLink: "/search?category=sports",
  },
  {
    title: "Phones & Tablets",
    items: [
      { name: "Smartphones", slug: "smartphones-pt", image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=200&q=80" },
      { name: "Tablets", slug: "tablets-pt", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&q=80" },
      { name: "Accessories", slug: "phone-accessories", image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=200&q=80" },
      { name: "Smartwatches", slug: "smartwatches", image: "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=200&q=80" },
    ],
    seeAllLink: "/search?category=phones-tablets",
  },
  {
    title: "Start Selling",
    items: [
      { name: "Register Store", slug: "_vendor_register", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&q=80" },
      { name: "Add Products", slug: "_vendor_register", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&q=80" },
      { name: "Manage Orders", slug: "_vendor_register", image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=200&q=80" },
      { name: "Grow Business", slug: "_vendor_register", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&q=80" },
    ],
    seeAllLink: "/vendor/register",
  },
  {
    title: "Deals of the Day",
    items: [
      { name: "Flash Sales", slug: "flash-sales", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
      { name: "Clearance", slug: "clearance", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&q=80" },
      { name: "Bundles", slug: "bundles", image: "https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=200&q=80" },
      { name: "New Arrivals", slug: "new-arrivals", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80" },
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
        <div className={`bg-gradient-to-r ${slide.bg} transition-all duration-700`}>
          <div className="container py-12 md:py-20 relative">
            <div className="max-w-lg">
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-primary-foreground leading-tight mb-3">
                {slide.title}
              </h1>
              <p className="text-primary-foreground/80 text-base md:text-lg mb-6">
                {slide.subtitle}
              </p>
              <Link
                to={slide.link}
                className="inline-block bg-[hsl(var(--marketplace-orange))] hover:bg-[hsl(var(--marketplace-orange-hover))] text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {slide.cta}
              </Link>
            </div>
          </div>
        </div>
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
