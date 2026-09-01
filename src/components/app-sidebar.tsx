import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  HandCoins,
  History,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Target,
  Users,
  Activity,
  Settings,
  Wallet,
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
import { MANAGER_ROLES, ROLE_LABELS, type Role } from "@/lib/mock-data";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  group: "Workspace" | "Management";
  /** Hidden if admin somehow has no university at all resolved (there always is one in practice). */
  requiresUniversity?: boolean;
}

const NAV: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", ...MANAGER_ROLES, "staff", "student", "finance"],
    group: "Workspace",
    requiresUniversity: true,
  },
  {
    title: "My tasks",
    url: "/my-tasks",
    icon: CheckSquare,
    roles: ["admin", ...MANAGER_ROLES, "staff", "student"],
    group: "Workspace",
    requiresUniversity: true,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: CalendarDays,
    roles: ["admin", ...MANAGER_ROLES, "staff", "student"],
    group: "Workspace",
    requiresUniversity: true,
  },
  {
    title: "All tasks",
    url: "/tasks",
    icon: ClipboardList,
    roles: ["admin", ...MANAGER_ROLES],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Users management",
    url: "/team",
    icon: Users,
    roles: ["admin", ...MANAGER_ROLES],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Workload",
    url: "/workload",
    icon: Activity,
    roles: ["admin", ...MANAGER_ROLES],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Logs",
    url: "/logs",
    icon: History,
    roles: ["admin", ...MANAGER_ROLES],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Units management",
    url: "/organization",
    icon: Building2,
    roles: ["admin", "principal"],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Objectives & Activities",
    url: "/objectives",
    icon: Target,
    roles: ["admin", "principal"],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["admin", "principal"],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Budget Approvals",
    url: "/budgets",
    icon: Wallet,
    roles: ["admin", ...MANAGER_ROLES, "finance"],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Material Requests",
    url: "/material-requests",
    icon: Package,
    roles: ["admin", ...MANAGER_ROLES, "staff"],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Procurement",
    url: "/procurement",
    icon: ShoppingCart,
    roles: ["admin", ...MANAGER_ROLES],
    group: "Management",
    requiresUniversity: true,
  },
  {
    title: "Requisitions",
    url: "/requisitions",
    icon: HandCoins,
    roles: ["admin", ...MANAGER_ROLES, "finance"],
    group: "Management",
    requiresUniversity: true,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { currentUser, effectiveUniversityId } = useWorkspace();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const groups: Array<NavItem["group"]> = ["Workspace", "Management"];
  const isAdminWithoutUniversity = currentUser.role === "admin" && !effectiveUniversityId;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-1 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            TP
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">TaskPlanner</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                Task and budgeting management
              </p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => {
          const items = NAV.filter(
            (i) =>
              i.group === group &&
              i.roles.includes(currentUser.role) &&
              !(i.requiresUniversity && isAdminWithoutUniversity),
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
          <UserAvatar member={currentUser} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {ROLE_LABELS[currentUser.role]}
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
