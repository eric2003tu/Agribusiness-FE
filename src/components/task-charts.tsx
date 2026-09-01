import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PROJECTS, STATUS_LABELS, type Task, type TaskStatus } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-store";

const STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: "var(--muted-foreground)",
  in_progress: "var(--info)",
  blocked: "var(--destructive)",
  completed: "var(--success)",
};

const statusConfig: ChartConfig = Object.fromEntries(
  (Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => [
    s,
    { label: STATUS_LABELS[s], color: STATUS_COLOR[s] },
  ]),
);

const countConfig: ChartConfig = { count: { label: "Tasks", color: "var(--primary)" } };

const PERFORMANCE_CONFIG: ChartConfig = {
  notStarted: { label: "Not started", color: "var(--muted-foreground)" },
  inProgress: { label: "In progress", color: "var(--info)" },
  overdue: { label: "Overdue", color: "var(--destructive)" },
  completed: { label: "Completed", color: "var(--success)" },
};

interface TaskChartsProps {
  rows: Task[];
}

export function TaskCharts({ rows }: TaskChartsProps) {
  const { members, getTaskFlags, orgUnitById } = useWorkspace();

  const statusData = useMemo(
    () =>
      (Object.keys(STATUS_LABELS) as TaskStatus[])
        .map((status) => ({
          status,
          label: STATUS_LABELS[status],
          count: rows.filter((t) => t.status === status).length,
        }))
        .filter((d) => d.count > 0),
    [rows],
  );

  const projectData = useMemo(
    () =>
      PROJECTS.map((project) => ({
        project,
        count: rows.filter((t) => t.project === project).length,
      })).filter((d) => d.count > 0),
    [rows],
  );

  const unitGroups = useMemo(
    () => [...new Set(members.map((m) => m.orgUnitId ?? "none"))],
    [members],
  );

  const unitData = useMemo(
    () =>
      unitGroups
        .map((unitId) => {
          const groupMemberIds = new Set(
            members.filter((m) => (m.orgUnitId ?? "none") === unitId).map((m) => m.id),
          );
          const groupTasks = rows.filter((t) => t.assigneeId && groupMemberIds.has(t.assigneeId));
          const name =
            unitId === "none" ? "University-wide" : (orgUnitById(unitId)?.name ?? "Unknown");
          return {
            name,
            total: groupTasks.length,
            notStarted: groupTasks.filter((t) => t.status === "not_started").length,
            inProgress: groupTasks.filter((t) => t.status === "in_progress").length,
            overdue: groupTasks.filter((t) => getTaskFlags(t.id).overdue).length,
            completed: groupTasks.filter((t) => t.status === "completed").length,
          };
        })
        .sort((a, b) => b.total - a.total),
    [rows, members, unitGroups, getTaskFlags, orgUnitById],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Status breakdown</h3>
        <p className="text-xs text-muted-foreground">{rows.length} tasks total</p>
        {statusData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No tasks to chart.</p>
        ) : (
          <ChartContainer config={statusConfig} className="mx-auto mt-2 aspect-square max-h-64">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="status"
                innerRadius={55}
                strokeWidth={2}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        )}
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Tasks by project</h3>
        <p className="text-xs text-muted-foreground">Across every project</p>
        {projectData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No tasks to chart.</p>
        ) : (
          <ChartContainer config={countConfig} className="mt-2 max-h-64 w-full">
            <BarChart data={projectData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="project"
                tickLine={false}
                axisLine={false}
                width={110}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--primary)" radius={4} maxBarSize={24} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="surface-card p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-foreground">Tasks by organization unit</h3>
        <p className="text-xs text-muted-foreground">
          Not started, in progress, overdue and completed — org health that scales with headcount.
          For individual performance, see the Team page.
        </p>
        <ChartContainer config={PERFORMANCE_CONFIG} className="mt-2 max-h-72 w-full">
          <BarChart data={unitData} barCategoryGap={16}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="notStarted" fill="var(--muted-foreground)" radius={4} maxBarSize={16} />
            <Bar dataKey="inProgress" fill="var(--info)" radius={4} maxBarSize={16} />
            <Bar dataKey="overdue" fill="var(--destructive)" radius={4} maxBarSize={16} />
            <Bar dataKey="completed" fill="var(--success)" radius={4} maxBarSize={16} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
