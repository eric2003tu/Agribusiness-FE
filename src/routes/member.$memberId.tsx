import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  GraduationCap,
  Mail,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ActivityFeed } from "@/components/activity-feed";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { PresenceBadge } from "@/components/presence-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/lib/workspace-store";
import { ROLE_LABELS } from "@/lib/mock-data";

export const Route = createFileRoute("/member/$memberId")({
  head: () => ({
    meta: [
      { title: "Member details — TaskFlow" },
      { name: "description", content: "View team member details and activity in TaskFlow." },
    ],
  }),
  component: MemberDetail,
});

const ROLE_ICON = {
  admin: Crown,
  principal: UserCog,
  dean: UserCog,
  hod: UserCog,
  campus_admin: UserCog,
  staff: Users,
  student: GraduationCap,
  finance: Wallet,
} as const;

function MemberDetail() {
  const { memberId } = Route.useParams();
  const { tasks, getMemberStats, memberById, orgUnitPath, updateTaskStatus, reassignTasks, can } =
    useWorkspace();
  const navigate = useNavigate();
  const [showAllTasks, setShowAllTasks] = useState(false);

  const member = memberById(memberId);

  if (!member) {
    return (
      <AppShell title="Member not found" description={`No member with ID "${memberId}" exists.`}>
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">This member may have been removed.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/team" })}>
            Back to team
          </Button>
        </div>
      </AppShell>
    );
  }

  const stats = getMemberStats(memberId);
  const RoleIcon = ROLE_ICON[member.role];
  const memberTasks = tasks.filter((t) => t.assigneeId === memberId);
  const displayTasks = showAllTasks ? memberTasks : memberTasks.slice(0, 5);
  const unitLabel =
    orgUnitPath(member.orgUnitId)
      .map((u) => u.name)
      .join(" / ") || "University-wide";

  return (
    <AppShell
      title={member.name}
      description={`${member.title} · ${unitLabel}`}
      actions={
        can("manageTasks") ? (
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/team" })}>
            <ArrowLeft className="size-4" /> Back to team
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto space-y-6">
        {!can("manageTasks") && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate({ to: "/team" })}
          >
            <ArrowLeft className="size-4" /> Back to team
          </Button>
        )}

        <div className="surface-card p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <UserAvatar member={member} className="size-16" />
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{member.name}</h2>
                  <Badge variant="secondary">
                    <RoleIcon className="size-3 mr-1" />
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  <PresenceBadge presence={stats.presence} lastActiveAt={stats.lastActiveAt} />
                </div>
                <p className="text-sm text-muted-foreground">{member.title}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-4" /> {member.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="size-4" /> {unitLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" /> {member.capacityHours}h / week
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="surface-card p-5">
            <p className="text-sm font-medium text-muted-foreground">Open tasks</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.openTasks}</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm font-medium text-muted-foreground">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-info">{stats.inProgressTasks}</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm font-medium text-muted-foreground">Completed</p>
            <p className="mt-2 text-3xl font-semibold text-success">{stats.completedTasks}</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm font-medium text-muted-foreground">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-destructive">{stats.blockedTasks}</p>
          </div>
        </div>

        <div className="surface-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Workload</h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {stats.hoursRemaining}h remaining of {member.capacityHours}h
            </span>
            <span>{stats.loadPercent}%</span>
          </div>
          <Progress value={Math.min(100, stats.loadPercent)} />
          <div className="flex gap-2">
            <Badge variant="secondary">{stats.openTasks} open</Badge>
            {stats.hasNoOpenTasks && (
              <Badge variant="outline" className="border-warning text-warning">
                No open tasks
              </Badge>
            )}
            {stats.loadPercent > 100 && <Badge variant="destructive">Overloaded</Badge>}
          </div>
        </div>

        <div className="surface-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
            {memberTasks.length > 5 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAllTasks(!showAllTasks)}>
                {showAllTasks ? "Show less" : `Show all (${memberTasks.length})`}
              </Button>
            )}
          </div>
          {memberTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tasks assigned.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Hours</TableHead>
                    {can("manageTasks") && <TableHead className="w-24"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          to={`/task/$taskId`}
                          params={{ taskId: t.id }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {t.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {t.id} · {t.project}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={t.priority} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.dueDate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.loggedHours}/{t.estimateHours}h
                      </TableCell>
                      {can("manageTasks") && (
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {t.status !== "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => updateTaskStatus([t.id], "completed")}
                              >
                                <CheckCircle2 className="size-3" /> Done
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive"
                              onClick={() => reassignTasks([t.id], null)}
                            >
                              Unassign
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="surface-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
          <ActivityFeed memberId={memberId} limit={10} />
        </div>
      </div>
    </AppShell>
  );
}
