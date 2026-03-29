import { useEffect } from "react";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Package, ShoppingBag, Store, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDashboard = () => {
  const { user, userRoles, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*, profiles(full_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, vendors(store_name)").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const updateVendorStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vendors").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      toast.success("Vendor status updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pendingVendors = vendors?.filter((v: any) => v.status === "pending") || [];
  const totalRevenue = allOrders?.reduce((sum, o: any) => sum + Number(o.total), 0) || 0;

  return (
    <MarketplaceLayout>
      <div className="container py-8">
        <h1 className="font-display text-2xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: ShoppingBag },
            { label: "Vendors", value: vendors?.length || 0, icon: Store },
            { label: "Products", value: allProducts?.length || 0, icon: Package },
            { label: "Pending Approvals", value: pendingVendors.length, icon: Users },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="vendors">
          <TabsList className="mb-4">
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-3 font-medium">Store</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Owner</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors?.map((v: any) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="p-3 font-medium">{v.store_name}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{v.profiles?.full_name || "—"}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          v.status === "approved" ? "bg-success/10 text-success" :
                          v.status === "pending" ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {v.status !== "approved" && (
                            <Button size="sm" variant="ghost" className="h-7 text-success" onClick={() => updateVendorStatus.mutate({ id: v.id, status: "approved" })}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {v.status !== "rejected" && (
                            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => updateVendorStatus.mutate({ id: v.id, status: "rejected" })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-3 font-medium">Order ID</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders?.map((o: any) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                      <td className="p-3 font-medium">KSh {Number(o.total).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          o.status === "delivered" ? "bg-success/10 text-success" :
                          o.status === "shipped" ? "bg-primary/10 text-primary" :
                          "bg-warning/10 text-warning"
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-3 font-medium">Product</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Vendor</th>
                    <th className="text-left p-3 font-medium">Price</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts?.map((p: any) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3 font-medium line-clamp-1">{p.name}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{p.vendors?.store_name || "—"}</td>
                      <td className="p-3">KSh {Number(p.price).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MarketplaceLayout>
  );
};

export default AdminDashboard;
