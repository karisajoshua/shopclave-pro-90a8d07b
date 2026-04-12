import { LayoutDashboard, Store, Package, ShoppingBag, Users, Upload, Bell, FolderTree, Settings, Wallet, Home, BarChart3, CreditCard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, Link } from "react-router-dom";
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
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Vendors", url: "/admin/vendors", icon: Store },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Orders", url: "/admin/orders", icon: ShoppingBag },
  { title: "Withdrawals", url: "/admin/withdrawals", icon: Wallet },
  { title: "Categories", url: "/admin/categories", icon: FolderTree },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Bulk Import", url: "/admin/bulk-import", icon: Upload },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
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
