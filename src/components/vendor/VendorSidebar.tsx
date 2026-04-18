import { LayoutDashboard, Package, Plus, ShoppingBag, DollarSign, Bell, Upload, Settings, Home, MessageCircle, Images } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import barakazLogo from "@/assets/barakaz-logo.png";

const items = [
  { title: "Dashboard", url: "/vendor/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/vendor/products", icon: Package },
  { title: "Add Product", url: "/vendor/products/new", icon: Plus },
  { title: "Bulk Import", url: "/vendor/bulk-import", icon: Upload },
  { title: "Media", url: "/vendor/media", icon: Images },
  { title: "Orders", url: "/vendor/orders", icon: ShoppingBag },
  { title: "Earnings", url: "/vendor/earnings", icon: DollarSign },
  { title: "Notifications", url: "/vendor/notifications", icon: Bell },
  { title: "Messages", url: "/vendor/messages", icon: MessageCircle },
  { title: "Store Settings", url: "/vendor/settings", icon: Settings },
];

export function VendorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();

  // Fetch vendor for this user
  const { data: vendor } = useQuery({
    queryKey: ["vendor-for-sidebar", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["vendor-unread-messages", vendor?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", vendor!.id)
        .eq("is_read", false)
        .neq("sender_id", user!.id);
      return count || 0;
    },
    enabled: !!vendor && !!user,
    refetchInterval: 15000,
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border px-4 py-4 flex items-center justify-center">
        <Link to="/">
          <img
            src={barakazLogo}
            alt="Barakaz"
            className="h-10 w-auto group-data-[collapsible=icon]:h-7 transition-all"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Vendor Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          {item.title}
                          {item.title === "Messages" && unreadCount > 0 && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </span>
                      )}
                      {collapsed && item.title === "Messages" && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Home className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Back to Site</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
