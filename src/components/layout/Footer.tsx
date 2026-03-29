import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import barakazLogo from "@/assets/barakaz-logo.png";

const Footer = () => (
  <footer>
    {/* Back to top */}
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="w-full bg-[hsl(var(--nav-secondary))] hover:bg-[hsl(var(--nav-secondary))]/90 text-primary-foreground text-sm py-3 text-center font-medium transition-colors"
    >
      Back to top
    </button>

    {/* Newsletter */}
    <div className="bg-[hsl(var(--marketplace-orange))]">
      <div className="container py-6 flex flex-col md:flex-row items-center justify-center gap-4">
        <p className="text-primary-foreground font-semibold text-sm md:text-base">
          New to Barakaz? Subscribe to our newsletter for exclusive deals!
        </p>
        <div className="flex gap-2 w-full max-w-md">
          <Input
            placeholder="Enter your email"
            className="bg-white text-foreground border-none h-10"
          />
          <Button className="bg-[hsl(var(--nav-dark))] text-primary-foreground hover:bg-[hsl(var(--nav-dark))]/90 shrink-0 font-semibold">
            Subscribe
          </Button>
        </div>
      </div>
    </div>

    {/* Link columns */}
    <div className="bg-[hsl(var(--nav-dark))] text-primary-foreground">
      <div className="container py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold text-sm mb-4">Need Help?</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/70">
              <li><Link to="/search" className="hover:text-primary-foreground transition-colors">Chat with us</Link></li>
              <li><Link to="/search" className="hover:text-primary-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/search" className="hover:text-primary-foreground transition-colors">Contact Us</Link></li>
              <li>
                <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary-foreground transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-4">About Barakaz</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/70">
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">About Us</Link></li>
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-4">Make Money with Barakaz</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/70">
              <li><Link to="/vendor/register" className="hover:text-primary-foreground transition-colors">Sell on Barakaz</Link></li>
              <li><Link to="/vendor/register" className="hover:text-primary-foreground transition-colors">Vendor Hub</Link></li>
              <li><Link to="/vendor/register" className="hover:text-primary-foreground transition-colors">Become a Partner</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-4">Barakaz Services</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/70">
              <li><Link to="/search" className="hover:text-primary-foreground transition-colors">Delivery Services</Link></li>
              <li><Link to="/search" className="hover:text-primary-foreground transition-colors">Return Policy</Link></li>
              <li><Link to="/auth" className="hover:text-primary-foreground transition-colors">My Account</Link></li>
              <li><Link to="/cart" className="hover:text-primary-foreground transition-colors">My Cart</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="bg-[hsl(var(--nav-dark))] border-t border-primary-foreground/10">
      <div className="container py-6 flex flex-col md:flex-row items-center justify-center gap-4">
        <img
          src={barakazLogo}
          alt="Barakaz"
          className="h-8 w-auto brightness-0 invert"
        />
        <p className="text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Barakaz. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
