import { useState, type ReactNode } from "react";
import { Box, Check, ChevronDown, ChevronUp, List } from "lucide-react";
import ProductReviews from "./ProductReviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ProductMeta {
  name?: string;
  category?: string;
  condition?: string;
  sku?: string;
  stock?: number;
  low_stock_threshold?: number | null;
  vendor_name?: string;
  brand?: string | null;
  mpn?: string | null;
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  option_values?: Record<string, string[]>;
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

const SpecRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[minmax(112px,34%)_1fr] border-b border-border last:border-0">
    <span className="border-r border-border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground/70 md:text-sm">{label}</span>
    <span className="min-w-0 break-words px-3 py-2 text-xs font-medium text-foreground/90 md:text-sm">{value}</span>
  </div>
);

const ShowMore = ({ children, hidden, expanded, onToggle }: { children: ReactNode; hidden: boolean; expanded: boolean; onToggle: () => void }) => (
  <>
    {children}
    {hidden ? (
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? "Show less" : "Show more"}
      </button>
    ) : null}
  </>
);

const FeatureList = ({ items, limit = 3 }: { items: string[]; limit?: number }) => {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);
  return <ShowMore hidden={items.length > limit} expanded={expanded} onToggle={() => setExpanded((value) => !value)}>
  <ul className="grid gap-2 text-sm text-foreground sm:grid-cols-2">
    {shown.map((item, index) => (
      <li key={`${item}-${index}`} className="flex items-start gap-2">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} />
        <span className="break-words">{item}</span>
      </li>
    ))}
  </ul>
  </ShowMore>;
};

const ExpandableDescription = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 420;
  const shown = !expanded && isLong ? `${text.slice(0, 420).trimEnd()}…` : text;
  return <ShowMore hidden={isLong} expanded={expanded} onToggle={() => setExpanded((value) => !value)}>
    <p className="whitespace-pre-line break-words text-xs leading-5 text-foreground/85 md:text-sm md:leading-6">{shown}</p>
  </ShowMore>;
};

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
  const lowStockLimit = meta?.low_stock_threshold ?? 5;
  const stockLabel = (() => {
    const s = meta?.stock;
    if (s == null) return null;
    if (s <= 0) return "Out of stock";
    if (s <= lowStockLimit) return `Only ${s} left`;
    return "In Stock";
  })();
  const dimensions = meta?.length_cm != null && meta.width_cm != null && meta.height_cm != null
    ? `${meta.length_cm} × ${meta.width_cm} × ${meta.height_cm} cm`
    : null;
  const specificationRows = [
    ["Product type", meta?.category],
    ...Object.entries(meta?.option_values || {}).map(([name, values]) => [`${name} options`, values.join(", ")]),
    ["Weight (package)", meta?.weight_g != null ? `${meta.weight_g} g` : null],
    ["Package dimensions", dimensions],
    ["Condition", meta?.condition ? (meta.condition === "new" ? "New" : "Used") : null],
    ["Brand", meta?.brand],
    ["Model / MPN", meta?.mpn],
    ["SKU", meta?.sku],
    ["Available stock", meta?.stock !== undefined ? String(meta.stock) : null],
    ["Sold by", meta?.vendor_name],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <section className="border-y border-border bg-card md:border" aria-label="Product information">
      <Tabs defaultValue="specifications">
        <div className="overflow-x-auto border-b border-border">
          <TabsList className="h-10 w-full justify-around rounded-none bg-transparent p-0 md:h-11 md:w-max md:min-w-full md:justify-start">
             <TabsTrigger value="description" className="h-10 flex-1 rounded-none border-b-2 border-transparent px-2 text-[11px] shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none md:h-11 md:flex-none md:px-5 md:text-sm">
              Description
            </TabsTrigger>
             <TabsTrigger value="specifications" className="h-10 flex-1 rounded-none border-b-2 border-transparent px-2 text-[11px] shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none md:h-11 md:flex-none md:px-5 md:text-sm">
              Specifications
            </TabsTrigger>
             <TabsTrigger value="reviews" className="h-10 flex-1 rounded-none border-b-2 border-transparent px-2 text-[11px] shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none md:h-11 md:flex-none md:px-5 md:text-sm">
              Reviews ({reviewCount})
            </TabsTrigger>
          </TabsList>
        </div>

         <TabsContent value="description" className="m-0 p-3 md:p-6">
          <h2 className="mb-3 text-lg font-bold">Product description</h2>
          {description ? (
            <ExpandableDescription text={description} />
          ) : (
            <p className="text-sm italic text-muted-foreground">No description available.</p>
          )}
          {parsedFeatures.length > 0 ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="mb-3 font-bold">Key features</h3>
              <FeatureList items={parsedFeatures} />
            </div>
          ) : null}
        </TabsContent>

         <TabsContent value="specifications" className="m-0 p-3 md:p-6">
           <div className="mb-3 flex items-center gap-2">
             <List className="h-5 w-5" aria-hidden="true" />
             <h2 className="text-lg font-bold">Specifications</h2>
           </div>
           {specificationRows.length ? (
             <div className="overflow-hidden rounded-sm border border-border">
               {specificationRows.map(([label, value]) => <SpecRow key={label} label={label} value={value} />)}
             </div>
           ) : <p className="text-sm italic text-muted-foreground">No specifications available.</p>}
           {meta?.whats_in_box?.length ? (
             <section className="mt-5 border-t border-border pt-5" aria-labelledby="box-heading">
               <div className="mb-3 flex items-center gap-2">
                 <Box className="h-5 w-5" aria-hidden="true" />
                 <h3 id="box-heading" className="font-bold">What's in the box</h3>
               </div>
               <FeatureList items={meta.whats_in_box} limit={4} />
             </section>
           ) : null}
        </TabsContent>

        <TabsContent value="reviews" className="m-0 p-1 md:p-2">
          <ProductReviews productId={productId} embedded showHeading={false} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default ProductDescriptionTabs;
