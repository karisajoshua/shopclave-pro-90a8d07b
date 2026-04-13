import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Truck, RotateCcw, Package } from "lucide-react";
import ProductReviews from "./ProductReviews";

interface ProductDescriptionTabsProps {
  description: string | null;
  productId: string;
}

const SectionBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-border rounded-lg bg-card">
    <div className="px-4 py-3">
      <h3 className="font-display font-bold text-base">{title}</h3>
    </div>
    <Separator />
    <div className="p-4">{children}</div>
  </div>
);

const ProductDescriptionTabs = ({ description, productId }: ProductDescriptionTabsProps) => {
  return (
    <div className="space-y-6">
      {/* Product Details */}
      <SectionBox title="Product details">
        {description ? (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description available.</p>
        )}
      </SectionBox>

      {/* Specifications */}
      <SectionBox title="Specifications">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
              Key Features
            </h4>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <Package className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>High quality product</span>
              </li>
              <li className="flex items-start gap-2">
                <Package className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Durable and long-lasting</span>
              </li>
              <li className="flex items-start gap-2">
                <Package className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Satisfaction guaranteed</span>
              </li>
            </ul>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
              What's in the Box
            </h4>
            <p className="text-sm text-foreground">1 x Product</p>
          </div>
        </div>
        <div className="space-y-0">
          <div className="flex border-t border-border py-2.5 text-sm">
            <span className="w-1/3 text-muted-foreground font-medium">SKU</span>
            <span className="text-foreground">—</span>
          </div>
          <div className="flex border-t border-border py-2.5 text-sm">
            <span className="w-1/3 text-muted-foreground font-medium">Brand</span>
            <span className="text-foreground">—</span>
          </div>
        </div>
      </SectionBox>

      {/* Reviews */}
      <SectionBox title="Customer Reviews">
        <ProductReviews productId={productId} embedded />
      </SectionBox>

      {/* Shipping & Returns */}
      <SectionBox title="Shipping & Returns">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium">Delivery</h4>
              <p className="text-sm text-muted-foreground">
                Standard delivery within 3-7 business days. Express delivery options may be available at checkout.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <RotateCcw className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium">Returns</h4>
              <p className="text-sm text-muted-foreground">
                Returns accepted within 7 days of delivery. Items must be in original condition with packaging intact.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium">Buyer Protection</h4>
              <p className="text-sm text-muted-foreground">
                Full refund if the item is not as described or not received.
              </p>
            </div>
          </div>
        </div>
      </SectionBox>
    </div>
  );
};

export default ProductDescriptionTabs;
