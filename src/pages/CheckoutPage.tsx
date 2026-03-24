import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CheckoutPage = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    city: "",
    country: "Kenya",
  });

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!address.fullName || !address.phone || !address.addressLine || !address.city) {
      toast.error("Please fill in all address fields");
      return;
    }
    setLoading(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total: totalPrice,
          shipping_address: address,
          payment_method: paymentMethod,
          status: "pending",
          payment_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        vendor_id: item.vendorId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      clearCart();
      toast.success("Order placed successfully!");
      navigate(`/order-confirmation/${order.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketplaceLayout>
      <div className="container py-8 max-w-3xl">
        <h1 className="font-display text-2xl font-bold mb-6">Checkout</h1>
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-6">
            {/* Shipping */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Shipping Address</h2>
              <div className="space-y-3">
                <div>
                  <Label>Full Name</Label>
                  <Input value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="+254..." />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={address.addressLine} onChange={(e) => setAddress({ ...address, addressLine: e.target.value })} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <RadioGroupItem value="mpesa" id="mpesa" />
                  <Label htmlFor="mpesa" className="cursor-pointer flex-1">
                    <span className="font-medium">M-Pesa</span>
                    <p className="text-xs text-muted-foreground">Pay via M-Pesa mobile money</p>
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="cursor-pointer flex-1">
                    <span className="font-medium">Card Payment</span>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="cursor-pointer flex-1">
                    <span className="font-medium">Cash on Delivery</span>
                    <p className="text-xs text-muted-foreground">Pay when you receive</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Summary */}
          <div className="md:col-span-2">
            <div className="bg-card rounded-lg border border-border p-6 sticky top-20">
              <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-muted-foreground line-clamp-1 flex-1">{item.name} ×{item.quantity}</span>
                    <span className="font-medium ml-2">KSh {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">KSh {totalPrice.toLocaleString()}</span>
              </div>
              <Button className="w-full mt-4 font-semibold" size="lg" disabled={loading} onClick={handlePlaceOrder}>
                {loading ? "Placing Order..." : "Place Order"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default CheckoutPage;
