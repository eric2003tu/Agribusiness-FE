import { createFileRoute } from "@tanstack/react-router";
import { Activity, Gauge, UserMinus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/workspace-store";
import { MANAGER_ROLES } from "@/lib/mock-data";

export const Route = createFileRoute("/workload")({
  head: () => ({
    meta: [
      { title: "Workload — TaskFlow capacity tracking" },
      {
        name: "description",
        content:
          "Track hours committed per person, spot idle workers and rebalance assignments before time is wasted.",
      },
      { property: "og:title", content: "Workload — TaskFlow capacity tracking" },
      { property: "og:description", content: "Spot idle workers and rebalance assignments." },
    ],
  }),
  component: Workload,
});

function Workload() {
  const { members, tasks, orgUnitPath } = useWorkspace();

  const rows = members.map((m) => {
    const assigned = tasks.filter((t) => t.assigneeId === m.id && t.status !== "completed");
    const hours = assigned.reduce((sum, t) => sum + (t.estimateHours - t.loggedHours), 0);
    const load = Math.min(150, Math.round((hours / m.capacityHours) * 100));
    const unitLabel =
      orgUnitPath(m.orgUnitId)
        .map((u) => u.name)
        .join(" / ") || "University-wide";
    return { member: m, assigned, hours, load, unitLabel };
  });

  const idle = rows.filter((r) => r.load === 0).length;
  const overloaded = rows.filter((r) => r.load > 100).length;
  const avgLoad = Math.round(rows.reduce((s, r) => s + r.load, 0) / (rows.length || 1));

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES]}
      title="Workload"
      description="Committed hours against weekly capacity for every team member."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} title="Team members" value={members.length} tone="brand" />
        <StatCard icon={Gauge} title="Average load" value={`${avgLoad}%`} tone="soft" />
        <StatCard
          icon={UserMinus}
          title="Idle"
          value={idle}
          tone={idle ? "warning" : "success"}
          hint="No open work"
        />
        <StatCard
          icon={Activity}
          title="Overloaded"
          value={overloaded}
          tone={overloaded ? "danger" : "success"}
          hint="Above capacity"
        />
      </div>

      <div className="surface-card divide-y divide-border">
        {rows.map(({ member, assigned, hours, load, unitLabel }) => (
          <div key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar member={member} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.title} · {unitLabel}
                </p>
              </div>
            </div>
            <div className="w-full sm:max-w-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {hours}h remaining of {member.capacityHours}h
                </span>
                <span>{load}%</span>
              </div>
              <Progress value={Math.min(100, load)} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{assigned.length} open</Badge>
              {load === 0 && <Badge variant="outline">Idle</Badge>}
              {load > 100 && <Badge variant="destructive">Overloaded</Badge>}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
