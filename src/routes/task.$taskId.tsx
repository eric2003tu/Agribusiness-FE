import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  Package,
  Paperclip,
  Pencil,
  PlayCircle,
  Plus,
  Tag,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { MaterialRequestChainProgress } from "@/components/material-request-chain";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_TYPE_LABELS, type TaskType } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-store";

interface DraftLine {
  item: string;
  quantity: string;
  estimatedCost: string;
}

const EMPTY_LINE: DraftLine = { item: "", quantity: "1", estimatedCost: "" };

export const Route = createFileRoute("/task/$taskId")({
  head: () => ({
    meta: [
      { title: "Task details — TaskFlow" },
      { name: "description", content: "View and manage task details in TaskFlow." },
    ],
  }),
  component: TaskDetails,
});

const TYPE_BADGE_STYLE: Record<TaskType, string> = {
  bug: "bg-destructive/12 text-destructive",
  feature: "bg-primary-soft text-primary",
  improvement: "bg-info/12 text-info",
  chore: "bg-muted text-muted-foreground",
};

function TaskDetails() {
  const { taskId } = Route.useParams();
  const {
    tasks,
    members,
    memberById,
    currentUser,
    updateTaskStatus,
    reassignTasks,
    deleteTasks,
    getTaskFlags,
    can,
    materialRequestForTask,
    submitMaterialRequest,
    resubmitMaterialRequest,
  } = useWorkspace();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const task = tasks.find((t) => t.id === taskId);
  const materialRequest = task ? materialRequestForTask(task.id) : undefined;

  const [draftLines, setDraftLines] = useState<DraftLine[]>(() =>
    materialRequest && materialRequest.status === "queried"
      ? materialRequest.items.map((it) => ({
          item: it.item,
          quantity: String(it.quantity),
          estimatedCost: String(it.estimatedCost),
        }))
      : [{ ...EMPTY_LINE }],
  );
  const [responseComment, setResponseComment] = useState("");

  if (!task) {
    return (
      <AppShell title="Task not found" description={`No task with ID "${taskId}" exists.`}>
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">This task may have been deleted.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/tasks" })}>
            Back to tasks
          </Button>
        </div>
      </AppShell>
    );
  }

  const assignee = memberById(task.assigneeId);
  const progress =
    task.estimateHours > 0 ? Math.round((task.loggedHours / task.estimateHours) * 100) : 0;
  const canManage = can("manageTasks");
  const isAssignee = task.assigneeId === currentUser.id;
  const canUpdateStatus = canManage || isAssignee;
  const flags = getTaskFlags(task.id);

  const canPlanMaterials =
    !!task.activityId && isAssignee && (!materialRequest || materialRequest.status === "queried");
  const draftTotal = draftLines.reduce((sum, l) => sum + (Number(l.estimatedCost) || 0), 0);

  const updateLine = (index: number, fields: Partial<DraftLine>) => {
    setDraftLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...fields } : l)));
  };
  const addLine = () => setDraftLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (index: number) =>
    setDraftLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const parsedLines = () =>
    draftLines
      .filter((l) => l.item.trim() && Number(l.quantity) > 0 && Number(l.estimatedCost) > 0)
      .map((l) => ({
        item: l.item.trim(),
        quantity: Number(l.quantity),
        estimatedCost: Number(l.estimatedCost),
      }));

  const submitPlan = () => {
    const items = parsedLines();
    if (items.length === 0) return;
    submitMaterialRequest({ taskId: task.id, items });
  };

  const linesChanged = () => {
    if (!materialRequest) return true;
    const before = materialRequest.items.map(
      (it) => `${it.item}|${it.quantity}|${it.estimatedCost}`,
    );
    const after = parsedLines().map((it) => `${it.item}|${it.quantity}|${it.estimatedCost}`);
    return before.length !== after.length || before.some((v, i) => v !== after[i]);
  };

  const resubmitPlan = () => {
    if (!materialRequest || !responseComment.trim()) return;
    const items = parsedLines();
    resubmitMaterialRequest(materialRequest.id, {
      comment: responseComment.trim(),
      ...(linesChanged() ? { items } : {}),
    });
    setResponseComment("");
  };

  return (
    <AppShell
      title={task.title}
      description={`${task.id} · ${task.project}`}
      actions={
        <>
          {canUpdateStatus && task.status !== "completed" && (
            <>
              {task.status !== "in_progress" && (
                <Button
                  variant="outline"
                  onClick={() => updateTaskStatus([task.id], "in_progress")}
                >
                  <PlayCircle className="size-4" /> Start
                </Button>
              )}
              <Button onClick={() => updateTaskStatus([task.id], "completed")}>
                <CheckCircle2 className="size-4" /> Mark complete
              </Button>
            </>
          )}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <UserCog className="size-4" /> Reassign
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                {members.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => reassignTasks([task.id], m.id)}>
                    {m.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => reassignTasks([task.id], null)}>
                  Unassign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" /> Edit
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate({ to: "/tasks" })}
        >
          <ArrowLeft className="size-4" /> Back to tasks
        </Button>

        {(flags.overdue || flags.stalled || flags.overBudget) && (
          <div className="flex flex-wrap gap-2">
            {flags.overdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" /> Overdue
              </Badge>
            )}
            {flags.stalled && (
              <Badge variant="outline" className="gap-1 border-warning text-warning">
                <AlertTriangle className="size-3" /> Stalled — no activity in 3+ days
              </Badge>
            )}
            {flags.overBudget && (
              <Badge variant="outline" className="gap-1 border-warning text-warning">
                <Clock className="size-3" /> Over hour estimate
              </Badge>
            )}
          </div>
        )}

        <div className="surface-card p-6 space-y-6">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Description</h2>
            <p className="mt-1 text-sm text-foreground">
              {task.description || "No description provided."}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Status</h2>
              <div className="mt-1.5">
                <StatusBadge status={task.status} />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Priority</h2>
              <div className="mt-1.5">
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Type</h2>
              <div className="mt-1.5">
                <Badge variant="secondary" className={TYPE_BADGE_STYLE[task.type]}>
                  {TASK_TYPE_LABELS[task.type]}
                </Badge>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Assignee</h2>
              <div className="mt-1.5 flex items-center gap-2">
                <UserAvatar member={assignee} className="size-6" />
                <span className="text-sm">{assignee?.name ?? "Unassigned"}</span>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Milestone</h2>
              <p className="mt-1.5 text-sm text-foreground">{task.milestone}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">Created</h2>
              <p className="mt-1.5 text-sm text-foreground">{task.createdAt}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Start date</p>
                <p className="text-sm text-foreground">{task.startDate || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due date</p>
                <p className="text-sm text-foreground">{task.dueDate}</p>
              </div>
            </div>
            {task.completedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-sm text-foreground">{task.completedAt}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Hours</h2>
              <span className="text-sm text-foreground">
                {task.loggedHours}h / {task.estimateHours}h
              </span>
            </div>
            <Progress value={Math.min(100, progress)} />
            <p className="text-xs text-muted-foreground">{progress}% of estimate logged</p>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{task.subtasks} subtasks</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{task.comments} comments</span>
            </div>
            <div className="flex items-center gap-2">
              <Paperclip className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{task.attachments} attachments</span>
            </div>
          </div>

          {task.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      <Tag className="size-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {task.activityId && (canPlanMaterials || materialRequest) && (
          <div className="surface-card space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Materials & budget</h2>
            </div>

            {canPlanMaterials ? (
              <div className="space-y-3">
                {materialRequest?.status === "queried" && (
                  <p className="text-sm text-warning">
                    {materialRequest.events[materialRequest.events.length - 1]?.comment}
                  </p>
                )}
                <div className="space-y-2">
                  {draftLines.map((line, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[10rem] flex-1 space-y-1">
                        {i === 0 && <Label className="text-xs">Item</Label>}
                        <Input
                          value={line.item}
                          placeholder="e.g. USB card readers"
                          onChange={(e) => updateLine(i, { item: e.target.value })}
                        />
                      </div>
                      <div className="w-20 space-y-1">
                        {i === 0 && <Label className="text-xs">Qty</Label>}
                        <Input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(i, { quantity: e.target.value })}
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        {i === 0 && <Label className="text-xs">Estimated cost (RWF)</Label>}
                        <Input
                          type="number"
                          min="1"
                          value={line.estimatedCost}
                          onChange={(e) => updateLine(i, { estimatedCost: e.target.value })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(i)}
                        disabled={draftLines.length === 1}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="size-3.5" /> Add material
                </Button>
                <p className="text-sm font-medium text-foreground">
                  Total: {draftTotal.toLocaleString()} RWF
                </p>
                {materialRequest?.status === "queried" ? (
                  <div className="space-y-2">
                    <Label htmlFor="mr-response-comment">Your response *</Label>
                    <Textarea
                      id="mr-response-comment"
                      rows={2}
                      value={responseComment}
                      onChange={(e) => setResponseComment(e.target.value)}
                    />
                    <Button onClick={resubmitPlan} disabled={!responseComment.trim()}>
                      Resubmit for approval
                    </Button>
                  </div>
                ) : (
                  <Button onClick={submitPlan}>Submit for approval</Button>
                )}
              </div>
            ) : (
              materialRequest && (
                <div className="space-y-3">
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {materialRequest.items.map((it) => (
                      <li key={it.id}>
                        {it.quantity}x {it.item} — {it.estimatedCost.toLocaleString()} RWF
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-semibold text-foreground">
                    Total:{" "}
                    {materialRequest.items
                      .reduce((sum, it) => sum + it.estimatedCost, 0)
                      .toLocaleString()}{" "}
                    RWF
                  </p>
                  <MaterialRequestChainProgress request={materialRequest} />
                  <Button asChild variant="outline" size="sm">
                    <Link to="/material-requests">Manage in Material Requests</Link>
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <EditTaskDialog task={task} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        onConfirm={() => {
          deleteTasks([task.id]);
          navigate({ to: "/tasks" });
        }}
      />
    </AppShell>
  );
}
