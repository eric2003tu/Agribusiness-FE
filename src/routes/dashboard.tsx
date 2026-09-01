import { useEffect } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ManagerDashboard, WorkerDashboard } from "@/components/dashboard-views";
import { useWorkspace } from "@/lib/workspace-store";
import { MANAGER_ROLES, ROLE_LABELS } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TaskFlow work planner" },
      {
        name: "description",
        content:
          "Role-based dashboards showing task progress, workload and idle capacity across your team in TaskFlow.",
      },
      { property: "og:title", content: "Dashboard — TaskFlow work planner" },
      {
        property: "og:description",
        content: "Task progress, workload and idle capacity at a glance.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { currentUser, effectiveUniversityId } = useWorkspace();
  const navigate = useNavigate();
  const role = currentUser.role;
  const adminWithoutUniversity = role === "admin" && !effectiveUniversityId;
  // Admin viewing a university acts exactly like that university's principal here.
  const actsAsManager =
    MANAGER_ROLES.includes(role) || (role === "admin" && !adminWithoutUniversity);

  useEffect(() => {
    if (adminWithoutUniversity) void navigate({ to: "/universities", replace: true });
    if (role === "finance") void navigate({ to: "/finance", replace: true });
  }, [adminWithoutUniversity, role, navigate]);

  if (adminWithoutUniversity || role === "finance") return null;

  if (role === "student") {
    return (
      <AppShell
        allowedRoles={["student"]}
        title="My dashboard"
        description={`Welcome back, ${currentUser.name.split(" ")[0]}. Tasks assigned to you.`}
      >
        <WorkerDashboard />
      </AppShell>
    );
  }

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES, "staff"]}
      title={actsAsManager ? `${ROLE_LABELS[role]} dashboard` : "My dashboard"}
      description={`Welcome back, ${currentUser.name.split(" ")[0]}. ${
        actsAsManager
          ? "Track your team's progress, blockers and available capacity."
          : "Your work for today — start tasks and mark them complete."
      }`}
      actions={
        role === "staff" ? undefined : (
          <Button asChild>
            <Link to="/tasks/new">
              <Plus className="size-4" /> New task
            </Link>
          </Button>
        )
      }
    >
      {actsAsManager && <ManagerDashboard />}
      {role === "staff" && <WorkerDashboard />}
    </AppShell>
  );
}
