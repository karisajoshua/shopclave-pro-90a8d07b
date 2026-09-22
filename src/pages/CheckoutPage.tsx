import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
import { useLocale } from "@/hooks/useLocale";

type Step = "address" | "delivery" | "payment";

const CheckoutPage = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { formatPrice } = useLocale();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [activeStep, setActiveStep] = useState<Step>("address");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const location = useLocation();
  const hasCheckedRef = useRef(false);
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    city: "",
    country: "Kenya",
    email: "",
  });

  // Prefill email from auth user
  useEffect(() => {
    if (user?.email) {
      setAddress((a) => (a.email ? a : { ...a, email: user.email ?? "" }));
    }
  }, [user?.email]);

  // Redirect to cart if empty - but skip on first render if coming from Buy Now
  useEffect(() => {
    if (hasCheckedRef.current && items.length === 0) {
      navigate("/cart", { replace: true });
    }
    // After first render, mark as checked
    const timer = setTimeout(() => { hasCheckedRef.current = true; }, 500);
    return () => clearTimeout(timer);
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
      setAddress((prev) => ({
        fullName: savedAddress.full_name,
        phone: savedAddress.phone || "",
        addressLine: savedAddress.address_line,
        city: savedAddress.city,
        country: savedAddress.country,
        email: prev.email || user?.email || "",
      }));
      setAddressConfirmed(true);
      setActiveStep("delivery");
    }
  }, [savedAddress, user?.email]);

  if (items.length === 0 || !user) {
    return null; // useEffect handles redirect
  }

  // Group items by vendor
  const vendorIds = [...new Set(items.map(i => i.vendorId))];
  const vendorGroups = items.reduce((acc, item) => {
    const key = item.vendorId;
    if (!acc[key]) acc[key] = { vendorName: item.vendorName, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { vendorName: string; items: typeof items }>);

  // Fetch vendor payment details via SECURITY DEFINER RPC (table access to
  // payment_details is restricted; the RPC requires an authenticated caller).
  const { data: vendorPaymentDetails } = useQuery({
    queryKey: ["vendor-payment-details", vendorIds],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_vendor_payment_details", {
        _vendor_ids: vendorIds,
      });
      return data || [];
    },
    enabled: vendorIds.length > 0,
  });

  // Paystack payout readiness per vendor in the cart. Vendors without a connected
  // subaccount are still sellable — their share is held by Barakaz and released
  // through the normal withdrawal flow.
  const { data: vendorPaystackStatuses } = useQuery({
    queryKey: ["vendor-paystack-statuses", vendorIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_paystack_accounts")
        .select("vendor_id, active")
        .in("vendor_id", vendorIds);
      return data || [];
    },
    enabled: vendorIds.length > 0,
  });

  const unreadyVendors = vendorIds.filter((vid) => {
    const row = vendorPaystackStatuses?.find((r) => r.vendor_id === vid);
    return !row?.active;
  });
  const directSettlement = unreadyVendors.length === 0;


  // Live shipping rates from Shippo (keyed by vendor_id)
  const [shippingRates, setShippingRates] = useState<Record<string, any[]>>({});
  const [shippingErrors, setShippingErrors] = useState<Record<string, string>>({});
  const [fallbackOrigin, setFallbackOrigin] = useState<Record<string, boolean>>({});
  const [selectedRates, setSelectedRates] = useState<Record<string, any>>({});
  const [ratesLoading, setRatesLoading] = useState(false);

  const shippingTotal = Object.values(selectedRates).reduce(
    (s: number, r: any) => s + Number(r?.amount_cad || 0),
    0
  );
  const grandTotal = totalPrice + shippingTotal;

  // Delivery dates
  const deliveryStart = new Date();
  deliveryStart.setDate(deliveryStart.getDate() + 3);
  const deliveryEnd = new Date();
  deliveryEnd.setDate(deliveryEnd.getDate() + 7);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });

  // Fetch live shipping rates when entering delivery step
  useEffect(() => {
    if (activeStep !== "delivery" || !addressConfirmed) return;
    if (ratesLoading) return;
    if (Object.keys(shippingRates).length > 0) return;

    let cancelled = false;
    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-shipping-rates", {
          body: {
            items: items.map((it) => ({
              product_id: it.productId,
              quantity: it.quantity,
              variant_id: it.variantId || null,
            })),
            shipping_address: address,
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const rateMap: Record<string, any[]> = {};
        const errMap: Record<string, string> = {};
        const fbMap: Record<string, boolean> = {};
        const autoSelect: Record<string, any> = {};
        (data?.vendors || []).forEach((v: any) => {
          if (v.blocked) errMap[v.vendor_id] = v.message;
          rateMap[v.vendor_id] = v.rates || [];
          if (v.rates?.length) autoSelect[v.vendor_id] = v.rates[0];
        });
        setShippingRates(rateMap);
        setShippingErrors(errMap);
        setFallbackOrigin(fbMap);
        setSelectedRates(autoSelect);
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || "Could not fetch shipping rates");
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    };
    fetchRates();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, addressConfirmed]);

  const handleConfirmAddress = () => {
    if (!address.fullName || !address.phone || !address.addressLine || !address.city) {
      toast.error("Please fill in all address fields");
      return;
    }
    // Reset rates so they re-fetch for the (possibly updated) address
    setShippingRates({});
    setSelectedRates({});
    setShippingErrors({});
    setFallbackOrigin({});
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
      // Check session validity before placing order
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/auth", { replace: true });
        return;
      }

      const orderPayload = {
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          variant_id: item.variantId || null,
          variant_label: item.variantLabel || null,
        })),
        shipping_address: address,
        payment_method: paymentMethod,
        // Only opaque quote ids — the server owns every shipping price.
        shipping_quote_ids: Object.values(selectedRates).map((r: any) => r.quote_id),
      };

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: orderPayload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // For card payments, initialize a Paystack transaction and redirect
      if (paymentMethod === "card") {
        const { data: paystackData, error: paystackErr } = await supabase.functions.invoke(
          "paystack-initialize",
          { body: { order_id: data.order_id } }
        );
        if (paystackErr) throw paystackErr;
        if (paystackData?.error) throw new Error(paystackData.error);
        if (!paystackData?.url) throw new Error("Failed to start Paystack checkout");
        clearCart();
        window.location.href = paystackData.url;
        return;
      }


      clearCart();
      toast.success("Order placed successfully!");
      navigate(`/order-confirmation/${data.order_id}`);
    } catch (err: any) {
      if (err.message?.includes("Refresh Token") || err.message?.includes("Unauthorized")) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/auth", { replace: true });
      } else {
        toast.error(err.message || "Failed to place order");
      }
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
                  <div>
                    <Label className="text-xs">Email for order updates</Label>
                    <Input
                      type="email"
                      value={address.email}
                      onChange={(e) => setAddress({ ...address, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      We'll send your order confirmation here.
                    </p>
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
                  {ratesLoading && (
                    <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                      Fetching live shipping rates…
                    </div>
                  )}

                  {Object.entries(vendorGroups).map(([vendorId, group]) => {
                    const rates = shippingRates[vendorId] || [];
                    const err = shippingErrors[vendorId];
                    const selected = selectedRates[vendorId];
                    return (
                      <div key={vendorId} className="border border-border rounded-lg p-3 space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Shipment from <span className="font-medium text-foreground">{group.vendorName}</span>
                        </p>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <img src={item.image} alt="" className="w-12 h-12 rounded object-cover bg-secondary border border-border" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                                {item.variantLabel && <p className="text-xs text-muted-foreground">{item.variantLabel}</p>}
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>

                        {err && !ratesLoading && (
                          <div className="text-xs text-warning bg-warning/10 rounded p-2">
                            {err}. An estimated fee will apply.
                          </div>
                        )}
                        {fallbackOrigin[vendorId] && !err && (
                          <p className="text-[11px] text-muted-foreground italic">
                            Estimated from Nairobi (vendor origin not set)
                          </p>
                        )}

                        {rates.length > 0 && (
                          <RadioGroup
                            value={selected?.rate_id || ""}
                            onValueChange={(rid) => {
                              const r = rates.find((x) => x.rate_id === rid);
                              if (r) setSelectedRates((s) => ({ ...s, [vendorId]: r }));
                            }}
                            className="space-y-1.5"
                          >
                            {rates.map((r) => (
                              <label
                                key={r.rate_id}
                                htmlFor={`${vendorId}-${r.rate_id}`}
                                className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer text-sm ${
                                  selected?.rate_id === r.rate_id ? "border-primary bg-primary/5" : "border-border"
                                }`}
                              >
                                <RadioGroupItem value={r.rate_id} id={`${vendorId}-${r.rate_id}`} />
                                <Truck className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{r.provider} — {r.service}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {r.estimated_days ? `${r.estimated_days} day${r.estimated_days > 1 ? "s" : ""}` : r.duration_terms || "Standard"}
                                  </p>
                                </div>
                                <p className="font-semibold">{formatPrice(r.amount)}</p>
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                        {rates.length > 0 && selected?.is_estimate && (
                          <p className="text-[11px] text-muted-foreground italic">
                            Estimated rate based on destination — final cost confirmed by carrier.
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    className="w-full"
                    onClick={handleConfirmDelivery}
                    disabled={
                      ratesLoading ||
                      Object.keys(vendorGroups).some(
                        (vid) => (shippingRates[vid]?.length || 0) > 0 && !selectedRates[vid]
                      )
                    }
                  >
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
                    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5">
                      <RadioGroupItem value="card" id="card" checked />
                      <Label htmlFor="card" className="cursor-pointer flex-1">
                        <span className="font-medium text-sm">Pay securely online</span>
                        <p className="text-xs text-muted-foreground">
                          Card, bank transfer, USSD or mobile money — processed by Paystack
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>

                  <p className="mt-3 text-xs text-muted-foreground">
                    You'll be redirected to a secure Paystack checkout. Prices are shown in
                    Canadian Dollars and charged in your local currency at today's rate. Each
                    seller's share is settled automatically and Barakaz keeps only its commission.
                  </p>

                  {!directSettlement && (
                    <div className="mt-3 p-3 rounded-md border border-warning/40 bg-warning/10 text-xs text-warning-foreground">
                      One or more sellers in your cart haven't added payout details yet. You can
                      still pay now — Barakaz holds their share securely and releases it once they
                      complete setup.
                    </div>
                  )}

                  <Button
                    className="w-full mt-4 font-semibold h-12 text-base"
                    size="lg"
                    disabled={loading}
                    onClick={handlePlaceOrder}
                  >
                    {loading ? "Redirecting to payment..." : "Continue to payment"}
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
                  <span className="font-medium">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fees</span>
                  <span className="font-medium">
                    {ratesLoading
                      ? "Calculating…"
                      : shippingTotal > 0
                        ? formatPrice(shippingTotal)
                        : addressConfirmed ? "—" : "Enter address"}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatPrice(grandTotal)}</span>
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
