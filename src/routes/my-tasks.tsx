import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock, Plus, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { TaskTable } from "@/components/task-table";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/my-tasks")({
  head: () => ({
    meta: [
      { title: "My tasks — TaskFlow" },
      {
        name: "description",
        content: "Your assigned work with filters, search, bulk status updates and CSV export.",
      },
      { property: "og:title", content: "My tasks — TaskFlow" },
      { property: "og:description", content: "Your assigned work, filters and quick status updates." },
    ],
  }),
  component: MyTasks,
});

function MyTasks() {
  const { tasks, currentUser, updateTaskStatus } = useWorkspace();
  const mine = tasks.filter((t) => t.assigneeId === currentUser.id);
  const today = new Date().toISOString().slice(0, 10);
  const inProgress = mine.filter((t) => t.status === "in_progress");

  return (
    <AppShell
      title="My tasks"
      description="Everything currently assigned to you. Select rows to update status or export."
      actions={
        <Button asChild>
          <Link to="/tasks/new">
            <Plus className="size-4" /> New task
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} title="Total tasks" value={mine.length} tone="brand" />
        <StatCard
          icon={Clock}
          title="In progress"
          value={mine.filter((t) => t.status === "in_progress").length}
          tone="soft"
        />
        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={mine.filter((t) => t.status === "completed").length}
          tone="success"
        />
        <StatCard
          icon={AlertTriangle}
          title="Overdue"
          value={mine.filter((t) => t.status !== "completed" && t.dueDate < today).length}
          tone="warning"
          hint="Past due date"
        />
      </div>

      {inProgress.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick complete</h3>
          <div className="flex flex-wrap gap-2">
            {inProgress.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => updateTaskStatus([t.id], "completed")}
              >
                <CheckCircle2 className="size-3.5" />
                {t.title.length > 30 ? t.title.slice(0, 30) + "..." : t.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      <TaskTable rows={mine} />
    </AppShell>
  );
}
