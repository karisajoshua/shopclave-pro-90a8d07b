import { Check } from "lucide-react";
import ProductReviews from "./ProductReviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ProductMeta {
  name?: string;
  category?: string;
  condition?: string;
  sku?: string;
  stock?: number;
  vendor_name?: string;
  video_url?: string | null;
  key_features?: string[] | null;
  whats_in_box?: string[] | null;
}

interface ProductDescriptionTabsProps {
  description: string | null;
  productId: string;
  reviewCount?: number;
  meta?: ProductMeta;
}

const SpecRow = ({ label, value }: { label: string; value: string | undefined | null }) => (
  <div className="grid grid-cols-[minmax(110px,32%)_1fr] border-b border-border py-3 text-sm last:border-0">
    <span className="font-medium text-muted-foreground">{label}</span>
    <span className="text-foreground">{value || "—"}</span>
  </div>
);

const FeatureList = ({ items }: { items: string[] }) => (
  <ul className="grid gap-2 text-sm text-foreground sm:grid-cols-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const ProductDescriptionTabs = ({ description, productId, reviewCount = 0, meta }: ProductDescriptionTabsProps) => {
  const parsedFeatures = (() => {
    if (meta?.key_features?.length) return meta.key_features;
    if (!description) return [];
    return description
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[-•*]\s*/.test(line))
      .map((line) => line.replace(/^[-•*]\s*/, ""));
  })();

  return (
    <section className="border border-border bg-card" aria-label="Product information">
      <Tabs defaultValue="description">
        <div className="overflow-x-auto border-b border-border">
           <TabsList className="h-11 w-max min-w-full justify-start rounded-none bg-transparent p-0">
             <TabsTrigger value="description" className="h-11 rounded-none border-b-2 border-transparent px-4 text-xs shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none md:px-5 md:text-sm">
              Description
            </TabsTrigger>
             <TabsTrigger value="specifications" className="h-11 rounded-none border-b-2 border-transparent px-4 text-xs shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none md:px-5 md:text-sm">
              Specifications
            </TabsTrigger>
             <TabsTrigger value="reviews" className="h-11 rounded-none border-b-2 border-transparent px-4 text-xs shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none md:px-5 md:text-sm">
              Reviews ({reviewCount})
            </TabsTrigger>
          </TabsList>
        </div>

         <TabsContent value="description" className="m-0 p-4 md:p-6">
          <h2 className="mb-3 text-lg font-bold">Product description</h2>
          {description ? (
             <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No description available.</p>
          )}
          {parsedFeatures.length > 0 ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="mb-3 font-bold">Key features</h3>
              <FeatureList items={parsedFeatures} />
            </div>
          ) : null}
          {meta?.whats_in_box?.length ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="mb-3 font-bold">What's in the box</h3>
              <FeatureList items={meta.whats_in_box} />
            </div>
          ) : null}
        </TabsContent>

         <TabsContent value="specifications" className="m-0 p-4 md:p-6">
          <h2 className="mb-3 text-lg font-bold">Specifications</h2>
          <div className="max-w-3xl border-y border-border">
            <SpecRow label="SKU" value={meta?.sku} />
            <SpecRow label="Category" value={meta?.category} />
            <SpecRow label="Condition" value={meta?.condition ? (meta.condition === "new" ? "New" : "Used") : undefined} />
            <SpecRow label="Available stock" value={meta?.stock !== undefined ? String(meta.stock) : undefined} />
            <SpecRow label="Sold by" value={meta?.vendor_name} />
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="m-0 p-1 md:p-2">
          <ProductReviews productId={productId} embedded showHeading={false} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default ProductDescriptionTabs;
