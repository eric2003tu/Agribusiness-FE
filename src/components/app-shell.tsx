import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/lib/workspace-store";
import { ROLE_LABELS, type Role } from "@/lib/mock-data";

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
  const { members, currentUser, session, ready, setCurrentUserId, signOut } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/", replace: true });
  }, [ready, session, navigate]);

  const allowed = !allowedRoles || allowedRoles.includes(currentUser.role);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen flex-col gap-4 bg-background p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Account menu">
                  <UserAvatar member={currentUser} />
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {currentUser.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[currentUser.role]}
                    </span>
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Switch demo user
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={currentUser.id} onValueChange={setCurrentUserId}>
                  {members.map((m) => (
                    <DropdownMenuRadioItem key={m.id} value={m.id}>
                      <span className="truncate">{m.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    signOut();
                    void navigate({ to: "/", replace: true });
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
                    Your role ({ROLE_LABELS[currentUser.role]}) doesn't have permission to view this
                    page. Ask an administrator if you need access.
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
