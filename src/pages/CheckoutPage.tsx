import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, MapPin, Truck, CreditCard, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Step = "address" | "delivery" | "payment";

const CheckoutPage = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [activeStep, setActiveStep] = useState<Step>("address");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    city: "",
    country: "Kenya",
  });

  // Redirect in useEffect to avoid render-time navigation
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [user, navigate]);

  // Load saved address
  const { data: savedAddress } = useQuery({
    queryKey: ["user-address", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_default", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (savedAddress) {
      setAddress({
        fullName: savedAddress.full_name,
        phone: savedAddress.phone || "",
        addressLine: savedAddress.address_line,
        city: savedAddress.city,
        country: savedAddress.country,
      });
      setAddressConfirmed(true);
      setActiveStep("delivery");
    }
  }, [savedAddress]);

  if (items.length === 0 || !user) {
    return null; // useEffect handles redirect
  }

  // Group items by vendor
  const vendorGroups = items.reduce((acc, item) => {
    const key = item.vendorId;
    if (!acc[key]) acc[key] = { vendorName: item.vendorName, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { vendorName: string; items: typeof items }>);

  const deliveryFee = 200;
  const grandTotal = totalPrice + deliveryFee;

  // Delivery dates
  const deliveryStart = new Date();
  deliveryStart.setDate(deliveryStart.getDate() + 3);
  const deliveryEnd = new Date();
  deliveryEnd.setDate(deliveryEnd.getDate() + 7);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });

  const handleConfirmAddress = () => {
    if (!address.fullName || !address.phone || !address.addressLine || !address.city) {
      toast.error("Please fill in all address fields");
      return;
    }
    setAddressConfirmed(true);
    setActiveStep("delivery");
  };

  const handleConfirmDelivery = () => {
    setDeliveryConfirmed(true);
    setActiveStep("payment");
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderPayload = {
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          variant_id: item.variantId || null,
          variant_label: item.variantLabel || null,
        })),
        shipping_address: address,
        payment_method: paymentMethod,
      };

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: orderPayload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      clearCart();
      toast.success("Order placed successfully!");
      navigate(`/order-confirmation/${data.order_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const stepDone = (step: Step) => {
    if (step === "address") return addressConfirmed;
    if (step === "delivery") return deliveryConfirmed;
    return false;
  };

  const stepNumber = (step: Step) => {
    if (step === "address") return 1;
    if (step === "delivery") return 2;
    return 3;
  };

  const StepHeader = ({ step, title }: { step: Step; title: string }) => (
    <div
      className={`flex items-center gap-3 p-4 cursor-pointer ${activeStep === step ? "" : "opacity-70"}`}
      onClick={() => {
        if (step === "address") setActiveStep("address");
        if (step === "delivery" && addressConfirmed) setActiveStep("delivery");
        if (step === "payment" && deliveryConfirmed) setActiveStep("payment");
      }}
    >
      {stepDone(step) ? (
        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
      ) : (
        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
          activeStep === step ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground/50"
        }`}>
          {stepNumber(step)}
        </div>
      )}
      <span className={`text-sm font-bold tracking-wider uppercase ${activeStep === step ? "text-foreground" : "text-muted-foreground"}`}>
        {title}
      </span>
      {stepDone(step) && activeStep !== step && (
        <button className="ml-auto text-xs text-primary hover:underline font-medium flex items-center gap-1">
          Change <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <MarketplaceLayout>
      <div className="container py-6 max-w-5xl">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/cart" className="text-sm text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Go back & continue shopping
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Steps */}
          <div className="space-y-4">
            {/* Step 1: Address */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <StepHeader step="address" title="Customer Address" />
              {activeStep === "address" && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Full Name</Label>
                      <Input value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Phone Number</Label>
                      <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="+254..." />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input value={address.addressLine} onChange={(e) => setAddress({ ...address, addressLine: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Country</Label>
                      <Input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
                    </div>
                  </div>
                  <Button className="w-full mt-2" onClick={handleConfirmAddress}>
                    Save & Continue
                  </Button>
                </div>
              )}
              {addressConfirmed && activeStep !== "address" && (
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{address.fullName}</p>
                  <p>{address.addressLine} | {address.city} - {address.country} | {address.phone}</p>
                </div>
              )}
            </div>

            {/* Step 2: Delivery Details */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <StepHeader step="delivery" title="Delivery Details" />
              {activeStep === "delivery" && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex gap-3 items-start bg-muted/30 rounded-lg p-3">
                    <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Door Delivery <span className="text-xs text-primary ml-2">(KSh {deliveryFee})</span></p>
                      <p className="text-xs text-muted-foreground">Delivery between {fmtDate(deliveryStart)} and {fmtDate(deliveryEnd)}</p>
                    </div>
                  </div>

                  {Object.entries(vendorGroups).map(([vendorId, group]) => (
                    <div key={vendorId} className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">Shipment from <span className="font-medium text-foreground">{group.vendorName}</span></p>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <img src={item.image} alt="" className="w-12 h-12 rounded object-cover bg-secondary border border-border" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                              {item.variantLabel && <p className="text-xs text-muted-foreground">{item.variantLabel}</p>}
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold">KSh {(item.price * item.quantity).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <Button className="w-full" onClick={handleConfirmDelivery}>
                    Confirm Delivery Details
                  </Button>
                </div>
              )}
              {deliveryConfirmed && activeStep !== "delivery" && (
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  <p>Door Delivery • {fmtDate(deliveryStart)} - {fmtDate(deliveryEnd)} • {items.length} item(s)</p>
                </div>
              )}
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <StepHeader step="payment" title="Payment Method" />
              {activeStep === "payment" && (
                <div className="px-4 pb-4">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <RadioGroupItem value="mpesa" id="mpesa" />
                      <Label htmlFor="mpesa" className="cursor-pointer flex-1">
                        <span className="font-medium text-sm">M-Pesa</span>
                        <p className="text-xs text-muted-foreground">Pay via M-Pesa mobile money</p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="cursor-pointer flex-1">
                        <span className="font-medium text-sm">Card Payment</span>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="cursor-pointer flex-1">
                        <span className="font-medium text-sm">Cash on Delivery</span>
                        <p className="text-xs text-muted-foreground">Pay when you receive</p>
                      </Label>
                    </div>
                  </RadioGroup>

                  <Button
                    className="w-full mt-4 font-semibold h-12 text-base"
                    size="lg"
                    disabled={loading}
                    onClick={handlePlaceOrder}
                  >
                    {loading ? "Placing Order..." : "Confirm Order"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <h3 className="font-semibold text-base">Order Summary</h3>
              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item's total ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span className="font-medium">KSh {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fees</span>
                  <span className="font-medium">KSh {deliveryFee.toLocaleString()}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">KSh {grandTotal.toLocaleString()}</span>
              </div>

              <Button
                className="w-full font-semibold h-11"
                size="lg"
                disabled={loading || !deliveryConfirmed || activeStep !== "payment"}
                onClick={handlePlaceOrder}
              >
                {loading ? "Placing Order..." : "Confirm Order"}
              </Button>

              {(!deliveryConfirmed || activeStep !== "payment") && (
                <p className="text-xs text-center text-muted-foreground">
                  (Complete the steps in order to proceed)
                </p>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                By proceeding, you are automatically accepting the{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default CheckoutPage;
