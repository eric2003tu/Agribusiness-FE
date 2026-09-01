import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { TaskSchedule } from "@/components/task-schedule";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — TaskFlow" },
      {
        name: "description",
        content: "Your assigned tasks laid out by due date, so you always know what's coming up.",
      },
    ],
  }),
  component: Schedule,
});

function Schedule() {
  const { tasks, currentUser } = useWorkspace();
  const mine = tasks.filter((t) => t.assigneeId === currentUser.id);

  return (
    <AppShell
      title="Schedule"
      description="Your assigned tasks laid out by due date, so you always know what's coming up."
    >
      <TaskSchedule rows={mine} />
    </AppShell>
  );
}
