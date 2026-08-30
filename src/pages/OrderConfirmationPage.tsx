import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PayState = "idle" | "checking" | "paid" | "pending" | "failed";

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [state, setState] = useState<PayState>("idle");
  const [charged, setCharged] = useState<{ amount: number; currency: string } | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const verify = async () => {
      setState("checking");
      try {
        const { data, error } = await supabase.functions.invoke("paystack-verify", {
          body: { order_id: orderId, ...(reference ? { reference } : {}) },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.paid) {
          setState("paid");
          if (data.amount && data.currency) {
            setCharged({ amount: data.amount, currency: data.currency });
          }
        } else if (data?.status === "failed") {
          setState("failed");
        } else {
          setState("pending");
        }
      } catch {
        if (!cancelled) setState("pending");
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [orderId, reference]);

  const fmt = charged
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: charged.currency }).format(
        charged.amount
      )
    : null;

  return (
    <MarketplaceLayout>
      <div className="container py-16 text-center max-w-lg">
        {state === "checking" ? (
          <Loader2 className="h-20 w-20 text-muted-foreground mx-auto mb-6 animate-spin" />
        ) : state === "failed" ? (
          <AlertCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
        ) : (
          <CheckCircle className="h-20 w-20 text-success mx-auto mb-6" />
        )}

        <h1 className="font-display text-3xl font-bold mb-3">
          {state === "failed" ? "Payment not completed" : "Order Placed!"}
        </h1>

        {state === "checking" && (
          <p className="text-muted-foreground mb-2">Confirming your payment…</p>
        )}
        {state === "paid" && (
          <p className="text-muted-foreground mb-2">
            Payment confirmed{fmt ? ` — ${fmt} charged` : ""}. We'll notify you when it ships.
          </p>
        )}
        {state === "pending" && (
          <p className="text-muted-foreground mb-2">
            Thank you for your order. If you paid online, confirmation can take a moment — your
            order page will update automatically.
          </p>
        )}
        {state === "failed" && (
          <p className="text-muted-foreground mb-2">
            We couldn't confirm your payment. No money has been taken — you can retry from your
            orders page.
          </p>
        )}

        <p className="text-sm text-muted-foreground mb-8">
          Order ID: <span className="font-mono font-medium text-foreground">{orderId?.slice(0, 8)}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
          <Link to="/account">
            <Button>View My Orders</Button>
          </Link>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default OrderConfirmationPage;
