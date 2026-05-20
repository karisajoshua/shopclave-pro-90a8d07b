import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/TranslationContext";

const CartPage = () => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <MarketplaceLayout>
        <div className="container py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">{t("cart.empty")}</h1>
          <p className="text-muted-foreground mb-6">{t("cart.discover")}</p>
          <Link to="/">
            <Button className="font-semibold">{t("cart.continueShopping")}</Button>
          </Link>
        </div>
      </MarketplaceLayout>
    );
  }

  const groupedByVendor = items.reduce((acc, item) => {
    if (!acc[item.vendorName]) acc[item.vendorName] = [];
    acc[item.vendorName].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <MarketplaceLayout>
      <div className="container py-8">
        <h1 className="font-display text-2xl font-bold mb-6">{t("cart.shoppingCart")} ({totalItems} {t("cart.items")})</h1>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {Object.entries(groupedByVendor).map(([vendor, vendorItems]) => (
              <div key={vendor} className="bg-card rounded-lg border border-border p-4">
                <p className="text-sm font-semibold text-muted-foreground mb-3">{t("cart.soldBy")}: {vendor}</p>
                <div className="space-y-3">
                  {vendorItems.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start">
                      <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-md bg-secondary" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium line-clamp-2">{item.name}</h3>
                        <p className="text-lg font-bold mt-1">${item.price.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive ml-auto" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg border border-border p-6 h-fit sticky top-20">
            <h2 className="font-semibold text-lg mb-4">{t("cart.orderSummary")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal")} ({totalItems} {t("cart.items")})</span>
                <span className="font-medium">${totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.delivery")}</span>
                <span className="font-medium text-success">{t("cart.free")}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-base">
                <span className="font-semibold">{t("cart.total")}</span>
                <span className="font-bold text-lg">${totalPrice.toLocaleString()}</span>
              </div>
            </div>
            <Link to="/checkout">
              <Button className="w-full mt-4 font-semibold">{t("cart.checkout")}</Button>
            </Link>
            <Button variant="ghost" className="w-full mt-2 text-sm text-muted-foreground" onClick={clearCart}>
              {t("cart.clearCart")}
            </Button>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default CartPage;
