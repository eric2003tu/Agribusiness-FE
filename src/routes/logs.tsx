import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ActivityFeed } from "@/components/activity-feed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import { MANAGER_ROLES, type ActivityAction } from "@/lib/mock-data";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Logs — TaskFlow" },
      {
        name: "description",
        content: "The full team activity log — every action, filterable by member and type.",
      },
    ],
  }),
  component: Logs,
});

const ACTION_OPTIONS: Array<{ value: ActivityAction | "all"; label: string }> = [
  { value: "all", label: "All actions" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "completed", label: "Completed" },
  { value: "reassigned", label: "Reassigned" },
  { value: "status_change", label: "Status change" },
  { value: "deleted", label: "Deleted" },
];

function Logs() {
  const { members } = useWorkspace();
  const [memberFilter, setMemberFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "all">("all");

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES]}
      title="Logs"
      description="Every action taken across the team, in order."
    >
      <div className="surface-card p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v as ActivityAction | "all")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ActivityFeed
          limit={200}
          memberId={memberFilter === "all" ? undefined : memberFilter}
          filter={actionFilter === "all" ? undefined : (log) => log.action === actionFilter}
        />
      </div>
    </AppShell>
  );
}
