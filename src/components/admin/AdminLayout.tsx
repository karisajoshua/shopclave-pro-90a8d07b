import { useEffect } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const { user, userRoles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3 bg-card justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-display text-lg font-bold">Admin Dashboard</h1>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center gap-1.5 text-muted-foreground">
                <Home className="h-4 w-4" /> Back to Site
              </Link>
            </Button>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
