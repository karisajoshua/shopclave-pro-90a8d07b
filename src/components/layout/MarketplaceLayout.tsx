import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

const MarketplaceLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0 animate-fade-in">{children}</main>
      {!isMobile && <Footer />}
      <MobileBottomNav />
    </div>
  );
};

export default MarketplaceLayout;
