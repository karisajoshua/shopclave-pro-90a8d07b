import { useParams, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const OrderConfirmationPage = () => {
  const { orderId } = useParams();

  return (
    <MarketplaceLayout>
      <div className="container py-16 text-center max-w-lg">
        <CheckCircle className="h-20 w-20 text-success mx-auto mb-6" />
        <h1 className="font-display text-3xl font-bold mb-3">Order Placed!</h1>
        <p className="text-muted-foreground mb-2">Thank you for your order. We'll notify you when it ships.</p>
        <p className="text-sm text-muted-foreground mb-8">Order ID: <span className="font-mono font-medium text-foreground">{orderId?.slice(0, 8)}</span></p>
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
