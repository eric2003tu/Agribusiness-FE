import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  ListTodo,
  Package,
  PackageSearch,
  Timer,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { ActivityFeed } from "@/components/activity-feed";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-store";
import type { Member, Task } from "@/lib/mock-data";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function TaskList({ rows, empty }: { rows: Task[]; empty: string }) {
  const { memberById } = useWorkspace();
  return (
    <ul className="divide-y divide-border">
      {rows.length === 0 && <li className="p-6 text-sm text-muted-foreground">{empty}</li>}
      {rows.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
          <UserAvatar member={memberById(t.assigneeId)} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
            <p className="text-xs text-muted-foreground">
              {t.project} · due {t.dueDate}
            </p>
          </div>
          <PriorityBadge priority={t.priority} />
          <StatusBadge status={t.status} />
        </li>
      ))}
    </ul>
  );
}

function loadFor(member: Member, tasks: Task[]) {
  const open = tasks.filter((t) => t.assigneeId === member.id && t.status !== "completed");
  const hours = open.reduce((s, t) => s + Math.max(0, t.estimateHours - t.loggedHours), 0);
  return { open, hours, load: Math.round((hours / member.capacityHours) * 100) };
}

/* --------------------------------- Manager -------------------------------- */

export function ManagerDashboard() {
  const {
    tasks,
    members,
    budgets,
    materialRequests,
    procurementItems,
    currentUser,
    currentApproverId,
    currentMaterialRequestApproverId,
  } = useWorkspace();
  const day = today();
  const budgetsNeedingAction = budgets.filter(
    (b) => b.status === "pending" && currentApproverId(b) === currentUser.id,
  );
  const materialRequestsNeedingAction = materialRequests.filter(
    (r) => r.status === "pending" && currentMaterialRequestApproverId(r) === currentUser.id,
  );
  const readyForProcurement = materialRequests.filter(
    (r) => r.status === "approved" && !procurementItems.some((p) => p.materialRequestId === r.id),
  );
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const blocked = tasks.filter((t) => t.status === "blocked");
  const dueSoon = tasks
    .filter((t) => t.status !== "completed" && t.dueDate >= day)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  const workers = members
    .map((m) => ({ member: m, ...loadFor(m, tasks) }))
    .sort((a, b) => b.load - a.load);

  return (
    <div className="space-y-6">
      {budgetsNeedingAction.length > 0 && (
        <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-warning p-4">
          <div className="flex items-center gap-3">
            <Wallet className="size-5 text-warning" />
            <p className="text-sm text-foreground">
              {budgetsNeedingAction.length} budget request
              {budgetsNeedingAction.length === 1 ? "" : "s"} waiting on your approval.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/budgets">Review now</Link>
          </Button>
        </div>
      )}

      {materialRequestsNeedingAction.length > 0 && (
        <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-warning p-4">
          <div className="flex items-center gap-3">
            <Package className="size-5 text-warning" />
            <p className="text-sm text-foreground">
              {materialRequestsNeedingAction.length} material request
              {materialRequestsNeedingAction.length === 1 ? "" : "s"} waiting on your approval.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/material-requests">Review now</Link>
          </Button>
        </div>
      )}

      {readyForProcurement.length > 0 && (
        <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-info p-4">
          <div className="flex items-center gap-3">
            <PackageSearch className="size-5 text-info" />
            <p className="text-sm text-foreground">
              {readyForProcurement.length} approved material request
              {readyForProcurement.length === 1 ? "" : "s"} ready to send to procurement.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/material-requests">Send now</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock}
          title="In progress"
          value={inProgress.length}
          tone="brand"
          hint="Being worked on now"
        />
        <StatCard
          icon={AlertTriangle}
          title="Blocked"
          value={blocked.length}
          tone={blocked.length ? "warning" : "success"}
          hint="Needs unblocking"
        />
        <StatCard icon={Timer} title="Due this week" value={dueSoon.length} tone="soft" />
        <StatCard
          icon={UserMinus}
          title="Idle members"
          value={workers.filter((w) => w.load === 0).length}
          tone={workers.some((w) => w.load === 0) ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Team load"
            subtitle="Remaining hours against weekly capacity"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/workload">Details</Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {workers.map(({ member, open, hours, load }) => (
                <li key={member.id} className="flex flex-wrap items-center gap-3 p-4">
                  <UserAvatar member={member} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {open.length} open · {hours}h remaining
                    </p>
                  </div>
                  <div className="w-40">
                    <Progress value={Math.min(100, load)} />
                  </div>
                  <span className="w-12 text-right text-xs text-muted-foreground">{load}%</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel
          title="Next deadlines"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/tasks">All</Link>
            </Button>
          }
        >
          <TaskList rows={dueSoon} empty="No upcoming deadlines." />
        </Panel>
      </div>

      <Panel title="Blocked work" subtitle="Clear these to keep the team moving">
        <TaskList rows={blocked} empty="Nothing is blocked." />
      </Panel>

      <Panel
        title="Live activity"
        subtitle="What the team is doing right now"
        action={
          <Button asChild variant="ghost" size="sm">
            <Link to="/logs">Full log</Link>
          </Button>
        }
      >
        <div className="p-2">
          <ActivityFeed limit={6} />
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- Worker --------------------------------- */

export function WorkerDashboard() {
  const { visibleTasks, currentUser, updateTaskStatus } = useWorkspace();
  const day = today();
  const mine = visibleTasks;
  const open = mine.filter((t) => t.status !== "completed");
  const done = mine.filter((t) => t.status === "completed");
  const overdue = open.filter((t) => t.dueDate < day);
  const hours = open.reduce((s, t) => s + Math.max(0, t.estimateHours - t.loggedHours), 0);
  const load = Math.round((hours / currentUser.capacityHours) * 100);
  const completionRate = Math.round((done.length / (mine.length || 1)) * 100);

  const upNext = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ListTodo} title="My open tasks" value={open.length} tone="brand" />
        <StatCard
          icon={Activity}
          title="My load"
          value={`${load}%`}
          tone={load > 100 ? "danger" : "soft"}
          hint={`${hours}h of ${currentUser.capacityHours}h`}
        />
        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={done.length}
          tone="success"
          trend={{ value: `${completionRate}% done`, positive: true }}
        />
        <StatCard
          icon={AlertTriangle}
          title="Overdue"
          value={overdue.length}
          tone={overdue.length ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Up next"
            subtitle="Sorted by due date"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/my-tasks">My tasks</Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {upNext.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground">You're all caught up.</li>
              )}
              {upNext.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.project} · due {t.dueDate}
                    </p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                  {t.status !== "in_progress" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTaskStatus([t.id], "in_progress")}
                    >
                      Start
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => updateTaskStatus([t.id], "completed")}>
                      Complete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">My progress</h2>
            </div>
            <p className="mt-4 text-3xl font-semibold text-foreground">{completionRate}%</p>
            <Progress value={completionRate} className="mt-3" />
            <p className="mt-3 text-xs text-muted-foreground">
              {done.length} of {mine.length} tasks done
            </p>
          </div>
          <Panel title="Recently completed">
            <TaskList rows={done.slice(0, 4)} empty="No completed tasks yet." />
          </Panel>
        </div>
      </div>
    </div>
  );
}
