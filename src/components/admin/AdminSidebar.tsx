import {
  LayoutDashboard, Store, Package, ShoppingBag, Users, Upload, Bell, FolderTree,
  Settings, Wallet, BarChart3, CreditCard, MessageCircle, Images, Shield,
} from "lucide-react";
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
import barakazIcon from "@/assets/barakaz-icon.png";

type Item = { title: string; url: string; icon: typeof Store; end?: boolean };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Operations",
    items: [
      { title: "Orders", url: "/admin/orders", icon: ShoppingBag },
      { title: "Evidence Vault", url: "/admin/evidence", icon: Shield },
      { title: "Messages", url: "/admin/messages", icon: MessageCircle },
      { title: "Notifications", url: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Categories", url: "/admin/categories", icon: FolderTree },
      { title: "Bulk Import", url: "/admin/bulk-import", icon: Upload },
      { title: "Media", url: "/admin/media", icon: Images },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Withdrawals", url: "/admin/withdrawals", icon: Wallet },
      { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Insights",
    items: [{ title: "Analytics", url: "/admin/analytics", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [
      { title: "Vendors", url: "/admin/vendors", icon: Store },
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 [&_[data-sidebar=sidebar]]:bg-admin-sidebar-bg [&_[data-sidebar=sidebar]]:text-admin-sidebar-fg"
    >
      <SidebarHeader className="border-b border-admin-sidebar-border px-4 py-4 bg-admin-sidebar-bg flex items-center justify-center">
        <Link to="/" className="flex items-center justify-center">
          <img
            src={collapsed ? barakazIcon : barakazLogo}
            alt="Barakaz"
            className="h-9 w-auto group-data-[collapsible=icon]:h-7 transition-all brightness-0 invert opacity-95"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-admin-sidebar-bg stagger-children">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-admin-sidebar-fg-muted px-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="hover:bg-transparent">
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className="relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-admin-sidebar-fg hover:bg-admin-sidebar-elevated hover:text-admin-sidebar-active-fg transition-colors"
                        activeClassName="bg-admin-sidebar-active-bg text-admin-sidebar-active-fg font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-primary before:rounded-r"
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
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
