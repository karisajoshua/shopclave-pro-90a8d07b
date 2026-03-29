import { useEffect } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { VendorSidebar } from "./VendorSidebar";
import { Button } from "@/components/ui/button";

const VendorLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user || vendorLoading) return null;

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">You haven't registered as a vendor yet.</p>
          <Link to="/vendor/register"><Button>Register as Vendor</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <VendorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3 bg-card">
            <SidebarTrigger />
            <h1 className="font-display text-lg font-bold">{vendor.store_name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 ${vendor.status === "approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
              {vendor.status}
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet context={{ vendor }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default VendorLayout;
