import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, User, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AccountPage = () => {
  const { user, userRoles, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/auth");
    return null;
  }

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "delivered": return "bg-success/10 text-success";
      case "shipped": return "bg-primary/10 text-primary";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-warning/10 text-warning";
    }
  };

  return (
    <MarketplaceLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">My Account</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {!userRoles.includes("vendor") && (
              <Link to="/vendor/register">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Store className="h-4 w-4" /> Become a Seller
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{profile?.full_name || "User"}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Orders */}
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" /> My Orders
        </h2>
        {orders?.length ? (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium">{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">KSh {Number(order.total).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No orders yet</p>
            <Link to="/">
              <Button className="mt-4" size="sm">Start Shopping</Button>
            </Link>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default AccountPage;
