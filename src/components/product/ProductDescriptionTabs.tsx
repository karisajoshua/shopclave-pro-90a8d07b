import { useState } from "react";
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

const SpecRow = ({ label, value }: { label: string; value: string | undefined | null }) => {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] border-b border-border py-3 text-sm last:border-b-0">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
};

const ProductDescriptionTabs = ({ description, productId, reviewCount = 0, meta }: ProductDescriptionTabsProps) => {
  const [tab, setTab] = useState("description");
  const features = meta?.key_features?.length
    ? meta.key_features
    : (description || "").split("\n").map((line) => line.trim()).filter((line) => /^[-•*]\s+/.test(line)).map((line) => line.replace(/^[-•*]\s*/, ""));

  return (
    <section id="product-information" className="mt-8 border border-border bg-card">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto border-b border-border">
          <TabsList className="h-auto min-w-max rounded-none bg-transparent p-0">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Description</TabsTrigger>
            <TabsTrigger value="specifications" className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Specifications</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent px-6 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Reviews ({reviewCount})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="description" className="m-0 p-5 md:p-7">
          <h2 className="mb-4 text-xl font-bold">Product Description</h2>
          {description ? <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{description}</p> : <p className="text-sm italic text-muted-foreground">No description available.</p>}
          {features.length > 0 && (
            <div className="mt-7">
              <h3 className="mb-3 font-semibold">Key Features</h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>{feature}</span></li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="specifications" className="m-0 p-5 md:p-7">
          <h2 className="mb-4 text-xl font-bold">Specifications</h2>
          <div className="max-w-3xl border-t border-border">
            <SpecRow label="SKU" value={meta?.sku} />
            <SpecRow label="Category" value={meta?.category} />
            <SpecRow label="Condition" value={meta?.condition ? (meta.condition === "new" ? "New" : "Used") : undefined} />
            <SpecRow label="Stock" value={meta?.stock !== undefined ? String(meta.stock) : undefined} />
            <SpecRow label="Sold by" value={meta?.vendor_name} />
          </div>
          {!!meta?.whats_in_box?.length && (
            <div className="mt-7">
              <h3 className="mb-3 font-semibold">What's in the Box</h3>
              <ul className="space-y-2 text-sm">{meta.whats_in_box.map((item, index) => <li key={index}>• {item}</li>)}</ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="m-0 p-5 md:p-7">
          <ProductReviews productId={productId} embedded />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default ProductDescriptionTabs;
