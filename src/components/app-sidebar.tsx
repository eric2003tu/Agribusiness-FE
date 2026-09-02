import { Link, useRouterState } from "@tanstack/react-router";
import {
  Boxes,
  Building2,
  Handshake,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Sprout,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import { ROLE_LABELS, primaryRole, type Role } from "@/lib/mock-data";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  group: "Workspace" | "Marketplace" | "Management";
}

const NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["farmer", "buyer", "supplier", "transporter", "admin"], group: "Workspace" },
  { title: "Messages", url: "/messages", icon: MessageSquare, roles: ["farmer", "buyer", "supplier", "transporter", "admin"], group: "Workspace" },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["farmer", "buyer", "supplier", "transporter", "admin"], group: "Workspace" },

  { title: "My listings", url: "/my-listings", icon: Warehouse, roles: ["farmer"], group: "Marketplace" },
  { title: "Produce listings", url: "/listings", icon: Sprout, roles: ["farmer", "buyer", "supplier", "transporter", "admin"], group: "Marketplace" },
  { title: "Buyer requests", url: "/requests", icon: ShoppingBasket, roles: ["farmer", "buyer", "admin"], group: "Marketplace" },
  { title: "Aggregation groups", url: "/aggregation", icon: Handshake, roles: ["farmer", "buyer", "admin"], group: "Marketplace" },
  { title: "Input marketplace", url: "/inputs", icon: Package, roles: ["farmer", "supplier", "admin"], group: "Marketplace" },
  { title: "Group purchases", url: "/group-purchases", icon: Boxes, roles: ["farmer", "supplier", "admin"], group: "Marketplace" },
  { title: "Transactions", url: "/transactions", icon: ShoppingCart, roles: ["farmer", "buyer", "supplier", "transporter", "admin"], group: "Marketplace" },
  { title: "Market prices", url: "/market-prices", icon: LineChart, roles: ["farmer", "buyer", "supplier", "transporter", "admin"], group: "Marketplace" },
  { title: "Transport pooling", url: "/transport-pool", icon: Truck, roles: ["transporter", "admin"], group: "Marketplace" },

  { title: "Users", url: "/users", icon: Users, roles: ["admin"], group: "Management" },
  { title: "Cooperatives", url: "/cooperatives", icon: Building2, roles: ["admin"], group: "Management" },
  { title: "Audit log", url: "/logs", icon: ScrollText, roles: ["admin"], group: "Management" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { currentUser } = useWorkspace();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const groups: Array<NavItem["group"]> = ["Workspace", "Marketplace", "Management"];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-1 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            AB
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">Agribridge</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Farmers · Buyers · Suppliers</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => {
          const items = NAV.filter(
            (i) => i.group === group && currentUser.roles.some((r) => i.roles.includes(r)),
          );
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group}>
              {!collapsed && <SidebarGroupLabel>{group}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <UserAvatar user={currentUser} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {ROLE_LABELS[primaryRole(currentUser)]}
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
