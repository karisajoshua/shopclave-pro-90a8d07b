import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import ProductReviews from "./ProductReviews";

interface ProductDescriptionTabsProps {
  description: string | null;
  productId: string;
}

const ProductDescriptionTabs = ({ description, productId }: ProductDescriptionTabsProps) => {
  return (
    <div className="bg-card rounded-lg border border-border">
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 gap-0">
          <TabsTrigger
            value="description"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
          >
            Description
          </TabsTrigger>
          <TabsTrigger
            value="specifications"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
          >
            Specifications
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
          >
            Reviews
          </TabsTrigger>
          <TabsTrigger
            value="shipping"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
          >
            Shipping & Returns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-0 p-4">
          {description ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description available.</p>
          )}
        </TabsContent>

        <TabsContent value="specifications" className="mt-0 p-4">
          <p className="text-sm text-muted-foreground italic">
            No specifications available for this product yet.
          </p>
        </TabsContent>

        <TabsContent value="reviews" className="mt-0 p-0">
          <ProductReviews productId={productId} embedded />
        </TabsContent>

        <TabsContent value="shipping" className="mt-0 p-4 space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductDescriptionTabs;
