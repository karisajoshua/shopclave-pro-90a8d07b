import { Link } from "react-router-dom";
import { MessageCircle, Facebook, Instagram, Twitter, Youtube, Linkedin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";
import barakazLogo from "@/assets/barakaz-logo.png";
import appBadges from "@/assets/app-store-badges.png";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer>
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-full bg-[hsl(var(--nav-secondary))] hover:bg-[hsl(var(--nav-secondary))]/90 text-primary-foreground text-sm py-3 text-center font-medium transition-colors"
      >
        {t("footer.backToTop")}
      </button>

      {/* Newsletter */}
      <div className="bg-[hsl(var(--marketplace-orange))]">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-center gap-4">
          <p className="text-primary-foreground font-semibold text-sm md:text-base">
            {t("footer.newsletter")}
          </p>
          <div className="flex gap-2 w-full max-w-md">
            <Input
              placeholder={t("footer.enterEmail")}
              className="bg-white text-foreground border-none h-10"
            />
            <Button className="bg-[hsl(var(--nav-dark))] text-primary-foreground hover:bg-[hsl(var(--nav-dark))]/90 shrink-0 font-semibold">
              {t("footer.subscribe")}
            </Button>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="bg-[hsl(var(--nav-dark))] text-primary-foreground">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold text-sm mb-4">{t("footer.needHelp")}</h4>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">{t("footer.chatWithUs")}</Link></li>
                <li><Link to="/help" className="hover:text-primary-foreground transition-colors">{t("footer.helpCenter")}</Link></li>
                <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">{t("footer.contactUs")}</Link></li>
                <li>
                  <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary-foreground transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" /> {t("footer.whatsappUs")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">{t("footer.aboutBarakaz")}</h4>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li><Link to="/about" className="hover:text-primary-foreground transition-colors">{t("footer.aboutUs")}</Link></li>
                <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">{t("footer.terms")}</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-primary-foreground transition-colors">{t("footer.privacy")}</Link></li>
                <li><Link to="/cookie-policy" className="hover:text-primary-foreground transition-colors">{t("footer.cookies")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">{t("footer.makeMoney")}</h4>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li><Link to="/vendor/register" className="hover:text-primary-foreground transition-colors">{t("footer.sellOnBarakaz")}</Link></li>
                <li><Link to="/vendor/register" className="hover:text-primary-foreground transition-colors">{t("footer.vendorHub")}</Link></li>
                <li><Link to="/vendor/register" className="hover:text-primary-foreground transition-colors">{t("footer.becomePartner")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">{t("footer.services")}</h4>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li><Link to="/delivery" className="hover:text-primary-foreground transition-colors">{t("footer.delivery")}</Link></li>
                <li><Link to="/return-policy" className="hover:text-primary-foreground transition-colors">{t("footer.returnPolicy")}</Link></li>
                <li><Link to="/auth" className="hover:text-primary-foreground transition-colors">{t("footer.myAccount")}</Link></li>
                <li><Link to="/cart" className="hover:text-primary-foreground transition-colors">{t("footer.myCart")}</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* App badges + bottom bar */}
      <div className="bg-[hsl(var(--nav-dark))] border-t border-primary-foreground/10">
        <div className="container py-6 flex flex-col items-center gap-4">
          <p className="text-sm text-primary-foreground/70 font-medium">{t("footer.getApp")}</p>
          <div className="flex items-center gap-3">
            <a href="#" target="_blank" rel="noopener noreferrer">
              <img src={appBadges} alt="Download on App Store & Google Play" className="h-10 w-auto" />
            </a>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"><Facebook className="h-5 w-5" /></a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/></svg>
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"><Instagram className="h-5 w-5" /></a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"><Twitter className="h-5 w-5" /></a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"><Youtube className="h-5 w-5" /></a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"><Linkedin className="h-5 w-5" /></a>
            <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"><MessageCircle className="h-5 w-5" /></a>
          </div>
          <div className="flex items-center gap-4 mt-2">
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
      </div>

      {/* Powered by */}
      <div className="bg-[hsl(var(--nav-dark))] border-t border-primary-foreground/5">
        <div className="container py-3 text-center">
          <p className="text-[11px] text-primary-foreground/40">
            Powered by Texcortech Systems
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
