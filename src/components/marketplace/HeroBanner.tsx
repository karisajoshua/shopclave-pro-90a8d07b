import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroBanner = () => (
  <section className="bg-gradient-to-r from-primary to-marketplace-orange-hover relative overflow-hidden">
    <div className="container py-12 md:py-20">
      <div className="max-w-xl relative z-10">
        <span className="inline-block bg-primary-foreground/20 text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
          🔥 Hot Deals This Week
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-primary-foreground leading-tight mb-4">
          Shop the Best Deals from Top Sellers
        </h1>
        <p className="text-primary-foreground/80 text-base md:text-lg mb-6 leading-relaxed">
          Discover thousands of products from verified vendors. Free delivery on orders over KSh 2,000.
        </p>
        <div className="flex gap-3">
          <Link to="/search">
            <Button size="lg" variant="secondary" className="font-semibold gap-2">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/vendor/register">
            <Button
              size="lg"
              className="font-semibold bg-card text-primary hover:bg-card/90 shadow-lg"
            >
              Start Selling
            </Button>
          </Link>
        </div>
      </div>
    </div>
    <div className="absolute right-0 top-0 w-72 h-72 bg-primary-foreground/5 rounded-full -translate-y-1/3 translate-x-1/4" />
    <div className="absolute right-20 bottom-0 w-48 h-48 bg-primary-foreground/5 rounded-full translate-y-1/3" />
  </section>
);

export default HeroBanner;
