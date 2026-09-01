import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTable } from "@/components/task-table";
import { TaskBoard } from "@/components/task-board";
import { useWorkspace } from "@/lib/workspace-store";
import { MANAGER_ROLES } from "@/lib/mock-data";

type TaskFlagFilter = "overdue" | "stalled" | "overBudget";
type TaskView = "board" | "grid";

export const Route = createFileRoute("/tasks")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { flag?: TaskFlagFilter | undefined; view?: TaskView | undefined } => {
    const flagValue = search["flag"];
    const viewValue = search["view"];
    return {
      flag:
        flagValue === "overdue" || flagValue === "stalled" || flagValue === "overBudget"
          ? flagValue
          : undefined,
      view: viewValue === "board" || viewValue === "grid" ? viewValue : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "All tasks — TaskFlow" },
      {
        name: "description",
        content:
          "Board and grid views over every task — search, filters, bulk reassignment and CSV export.",
      },
      { property: "og:title", content: "All tasks — TaskFlow" },
      { property: "og:description", content: "Board and grid views over your team's work." },
    ],
  }),
  component: AllTasks,
});

function AllTasks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isNested = pathname !== "/tasks";
  const { flag, view } = Route.useSearch();
  const navigate = useNavigate();
  const { tasks, getTaskFlags } = useWorkspace();

  if (isNested) {
    return <Outlet />;
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeView = view ?? "board";
  const filteredTasks = flag ? tasks.filter((t) => getTaskFlags(t.id)[flag]) : tasks;

  const setView = (next: string) =>
    navigate({ to: "/tasks", search: (prev) => ({ ...prev, view: next as TaskView }) });

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES]}
      title="All tasks"
      description="Board and grid views over your team's work."
      actions={
        <Button asChild>
          <Link to="/tasks/new">
            <Plus className="size-4" /> New task
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} title="Total tasks" value={tasks.length} tone="brand" />
        <StatCard
          icon={Clock}
          title="In progress"
          value={tasks.filter((t) => t.status === "in_progress").length}
          tone="soft"
        />
        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={tasks.filter((t) => t.status === "completed").length}
          tone="success"
        />
        <StatCard
          icon={AlertTriangle}
          title="Unassigned"
          value={tasks.filter((t) => !t.assigneeId && t.dueDate >= today).length}
          tone="warning"
          hint="Waiting for an owner"
        />
      </div>

      <Tabs value={activeView} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="grid">Grid</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <TaskBoard rows={filteredTasks} />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <TaskTable
            key={flag ?? "none"}
            rows={tasks}
            initialFilters={flag ? { [flag]: "yes" } : undefined}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
