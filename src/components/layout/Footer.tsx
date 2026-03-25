import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import barakazLogo from "@/assets/barakaz-logo.png";

const Footer = () => (
  <footer className="bg-marketplace-dark text-secondary">
    <div className="container py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <img
            src={barakazLogo}
            alt="Barakaz"
            className="h-8 w-auto mb-3 brightness-0 invert"
          />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your trusted multivendor marketplace. Shop from thousands of sellers with fast delivery across Kenya.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3 text-primary-foreground">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><Link to="/search" className="hover:text-primary transition-colors">All Products</Link></li>
            <li><Link to="/vendor/register" className="hover:text-primary transition-colors">Sell on Barakaz</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3 text-primary-foreground">Customer Service</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-primary transition-colors">My Account</Link></li>
            <li><Link to="/cart" className="hover:text-primary transition-colors">Cart</Link></li>
            <li><span className="cursor-default">Returns & Refunds</span></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3 text-primary-foreground">Contact Us</h4>
          <p className="text-sm text-muted-foreground mb-3">Need help? Chat with us on WhatsApp</p>
          <a
            href="https://wa.me/254700000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-success text-success-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp Us
          </a>
        </div>
      </div>
      <div className="border-t border-muted-foreground/20 mt-8 pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Barakaz. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
