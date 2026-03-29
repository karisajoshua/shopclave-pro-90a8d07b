import MarketplaceLayout from "@/components/layout/MarketplaceLayout";

interface StaticPageProps {
  title: string;
  children: React.ReactNode;
}

const StaticPage = ({ title, children }: StaticPageProps) => (
  <MarketplaceLayout>
    <div className="container py-10 max-w-3xl">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">{title}</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        {children}
      </div>
    </div>
  </MarketplaceLayout>
);

export default StaticPage;
