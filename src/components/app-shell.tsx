import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, Settings as SettingsIcon, ShoppingCart, UserCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageLoader } from "@/components/page-loader";
import { useWorkspace } from "@/lib/workspace-store";
import { ROLE_LABELS, primaryRole, type Role } from "@/lib/mock-data";

export function AppShell({
  title,
  description,
  actions,
  allowedRoles,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  allowedRoles?: Role[];
  children: ReactNode;
}) {
  const { currentUser, session, ready, signOut, cartCount } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/login", replace: true });
  }, [ready, session, navigate]);

  const allowed = !allowedRoles || currentUser.roles.some((r) => allowedRoles.includes(r));

  if (!ready || !session) {
    return <PageLoader />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            </div>
            <Button asChild variant="ghost" size="icon" className="relative" aria-label="Cart">
              <Link to="/cart">
                <ShoppingCart className="size-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Account menu">
                  <UserAvatar user={currentUser} />
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {currentUser.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[primaryRole(currentUser)]}
                    </span>
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.phone}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/users/$userId" params={{ userId: currentUser.id }}>
                    <UserCircle className="size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <SettingsIcon className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    void navigate({ to: "/login", replace: true });
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                  {description && (
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
                {actions && allowed && <div className="flex flex-wrap gap-2">{actions}</div>}
              </div>
              {allowed ? (
                children
              ) : (
                <div className="surface-card p-10 text-center">
                  <h2 className="text-lg font-semibold text-foreground">Access restricted</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Your role ({ROLE_LABELS[primaryRole(currentUser)]}) doesn't have permission to
                    view this page. Ask an administrator if you need access.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
