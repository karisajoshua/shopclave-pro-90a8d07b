import { LayoutDashboard, Package, Plus, ShoppingBag, DollarSign, Bell, Upload, Settings, Home, MessageCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
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
  { title: "Orders", url: "/vendor/orders", icon: ShoppingBag },
  { title: "Earnings", url: "/vendor/earnings", icon: DollarSign },
  { title: "Notifications", url: "/vendor/notifications", icon: Bell },
  { title: "Messages", url: "/vendor/messages", icon: MessageCircle },
  { title: "Store Settings", url: "/vendor/settings", icon: Settings },
];

export function VendorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
                      {!collapsed && <span>{item.title}</span>}
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
