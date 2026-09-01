import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  ListChecks,
  Plus,
  Target,
  Trash2,
  UserCog,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { PlanNodeTable } from "@/components/plan-node-table";
import {
  EMPTY_PLAN_NODE_FORM,
  PlanNodeFormFields,
  type PlanNodeFormState,
} from "@/components/plan-node-form-fields";
import { TaskTable } from "@/components/task-table";
import { BudgetChainProgress } from "@/components/budget-chain";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/lib/workspace-store";
import {
  PLAN_NODE_CHILD_TYPES,
  PLAN_NODE_LABELS,
  PLAN_NODE_LABELS_PLURAL,
  PLAN_NODE_STATUS_LABELS,
  PRIORITY_LABELS,
  type PlanNodeType,
} from "@/lib/mock-data";

export const Route = createFileRoute("/objectives/$nodeId")({
  head: () => ({
    meta: [{ title: "Objectives & Activities — TaskFlow" }],
  }),
  component: PlanNodeDetail,
});

const NODE_ICON: Record<PlanNodeType, LucideIcon> = {
  strategic_objective: Target,
  unit_objective: Target,
  specific_objective: Target,
  output: ListChecks,
  activity: Zap,
};

const OWNER_LABEL: Record<PlanNodeType, string | null> = {
  strategic_objective: "Responsible officer",
  unit_objective: "Responsible officer",
  specific_objective: "Responsible officer",
  output: null,
  activity: "Activity manager",
};

function PlanNodeDetail() {
  const { nodeId } = Route.useParams();
  const navigate = useNavigate();
  const {
    planNodes,
    planNodeById,
    planNodePath,
    orgUnitById,
    memberById,
    tasks,
    addPlanNode,
    updatePlanNode,
    deletePlanNode,
    budgetForPlanNode,
    submitBudget,
  } = useWorkspace();

  const [addChildOpen, setAddChildOpen] = useState(false);
  const [addForm, setAddForm] = useState<PlanNodeFormState>(EMPTY_PLAN_NODE_FORM);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<PlanNodeFormState>(EMPTY_PLAN_NODE_FORM);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetDescription, setBudgetDescription] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

  const node = planNodeById(nodeId);

  if (!node) {
    return (
      <AppShell
        allowedRoles={["admin", "principal"]}
        title="Not found"
        description="This item no longer exists."
      >
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">It may have been deleted.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/objectives" })}>
            Back to Objectives & Activities
          </Button>
        </div>
      </AppShell>
    );
  }

  const path = planNodePath(nodeId);
  const ancestors = path.slice(0, -1);
  const responsibleUnit = orgUnitById(node.responsibleUnitId);
  const owner = memberById(node.ownerId);
  const ownerLabel = OWNER_LABEL[node.type];
  const childTypes = PLAN_NODE_CHILD_TYPES[node.type];
  const childType = childTypes[0];
  const children = childType
    ? planNodes.filter((n) => n.parentId === node.id && n.type === childType)
    : [];
  const activityTasks =
    node.type === "activity" ? tasks.filter((t) => t.activityId === node.id) : [];
  const budget = budgetForPlanNode(node.id);

  const submitBudgetRequest = () => {
    const amount = Number(budgetAmount);
    if (!budgetDescription.trim() || !amount || amount <= 0) return;
    submitBudget({
      planNodeId: node.id,
      description: budgetDescription.trim(),
      requestedAmount: amount,
    });
    setBudgetOpen(false);
    setBudgetDescription("");
    setBudgetAmount("");
  };

  const openAddChild = () => {
    setAddForm(EMPTY_PLAN_NODE_FORM);
    setAddChildOpen(true);
  };

  const submitAddChild = () => {
    if (!childType || !addForm.title.trim()) return;
    if (childType === "activity") {
      const unit =
        addForm.responsibleUnitId !== "none" ? orgUnitById(addForm.responsibleUnitId) : undefined;
      if (!unit || unit.type !== "school") {
        toast.error("Select a responsible school", {
          description: "An activity needs a school so its Dean can assign tasks under it.",
        });
        return;
      }
    }
    addPlanNode({
      type: childType,
      parentId: node.id,
      title: addForm.title.trim(),
      description: addForm.description.trim(),
      responsibleUnitId: addForm.responsibleUnitId === "none" ? null : addForm.responsibleUnitId,
      ownerId: addForm.ownerId === "none" ? null : addForm.ownerId,
      indicator: addForm.indicator,
      baseline: addForm.baseline,
      target: addForm.target,
      location: addForm.location,
      startDate: addForm.startDate,
      completionDate: addForm.completionDate,
      priority: addForm.priority,
      status: addForm.status,
    });
    setAddChildOpen(false);
  };

  const openEdit = () => {
    setEditForm({
      title: node.title,
      description: node.description,
      responsibleUnitId: node.responsibleUnitId ?? "none",
      ownerId: node.ownerId ?? "none",
      indicator: node.indicator ?? "",
      baseline: node.baseline ?? "",
      target: node.target ?? "",
      strategicPillar: node.strategicPillar ?? "",
      planningPeriod: node.planningPeriod ?? "",
      sourceOfVerification: node.sourceOfVerification ?? "",
      location: node.location ?? "",
      startDate: node.startDate ?? "",
      completionDate: node.completionDate ?? "",
      priority: node.priority ?? "medium",
      status: node.status ?? "not_started",
    });
    setEditOpen(true);
  };

  const submitEdit = () => {
    if (!editForm.title.trim()) return;
    if (node.type === "activity") {
      const unit =
        editForm.responsibleUnitId !== "none" ? orgUnitById(editForm.responsibleUnitId) : undefined;
      if (!unit || unit.type !== "school") {
        toast.error("Select a responsible school", {
          description: "An activity needs a school so its Dean can assign tasks under it.",
        });
        return;
      }
    }
    updatePlanNode(node.id, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      responsibleUnitId: editForm.responsibleUnitId === "none" ? null : editForm.responsibleUnitId,
      ownerId: editForm.ownerId === "none" ? null : editForm.ownerId,
      ...(editForm.indicator ? { indicator: editForm.indicator } : {}),
      ...(editForm.baseline ? { baseline: editForm.baseline } : {}),
      ...(editForm.target ? { target: editForm.target } : {}),
      ...(editForm.strategicPillar ? { strategicPillar: editForm.strategicPillar } : {}),
      ...(editForm.planningPeriod ? { planningPeriod: editForm.planningPeriod } : {}),
      ...(editForm.sourceOfVerification
        ? { sourceOfVerification: editForm.sourceOfVerification }
        : {}),
      ...(editForm.location ? { location: editForm.location } : {}),
      ...(editForm.startDate ? { startDate: editForm.startDate } : {}),
      ...(editForm.completionDate ? { completionDate: editForm.completionDate } : {}),
      ...(node.type === "activity" ? { priority: editForm.priority, status: editForm.status } : {}),
    });
    setEditOpen(false);
  };

  const detailRows: Array<{ label: string; value: string }> = [];
  if (node.indicator) detailRows.push({ label: "Indicator", value: node.indicator });
  if (node.baseline) detailRows.push({ label: "Baseline", value: node.baseline });
  if (node.target) detailRows.push({ label: "Target", value: node.target });
  if (node.strategicPillar)
    detailRows.push({ label: "Strategic pillar", value: node.strategicPillar });
  if (node.planningPeriod)
    detailRows.push({ label: "Planning period", value: node.planningPeriod });
  if (node.sourceOfVerification)
    detailRows.push({ label: "Source of verification", value: node.sourceOfVerification });
  if (node.location) detailRows.push({ label: "Location", value: node.location });
  if (node.startDate) detailRows.push({ label: "Start date", value: node.startDate });
  if (node.completionDate)
    detailRows.push({ label: "Completion date", value: node.completionDate });

  return (
    <AppShell
      allowedRoles={["admin", "principal"]}
      title={node.title}
      description={
        ancestors.length > 0
          ? ancestors.map((n) => n.title).join(" / ")
          : "Top of the planning chain"
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}>
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      }
    >
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/objectives" className="hover:text-foreground hover:underline">
          Objectives & Activities
        </Link>
        {path.map((n, i) => (
          <span key={n.id} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5" />
            {i === path.length - 1 ? (
              <span className="font-medium text-foreground">{n.title}</span>
            ) : (
              <Link
                to="/objectives/$nodeId"
                params={{ nodeId: n.id }}
                className="hover:text-foreground hover:underline"
              >
                {n.title}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={NODE_ICON[node.type]}
          title="Type"
          value={PLAN_NODE_LABELS[node.type]}
          tone="brand"
        />
        {responsibleUnit ? (
          <StatCard
            icon={Building2}
            title="Responsible unit"
            value={responsibleUnit.name}
            tone="soft"
          />
        ) : (
          <StatCard icon={Building2} title="Responsible unit" value="Unassigned" tone="warning" />
        )}
        {ownerLabel ? (
          owner ? (
            <Link to="/member/$memberId" params={{ memberId: owner.id }} className="block">
              <StatCard
                icon={UserCog}
                title={ownerLabel}
                value={owner.name}
                hint={owner.email}
                tone="success"
              />
            </Link>
          ) : (
            <StatCard icon={UserCog} title={ownerLabel} value="Unassigned" tone="warning" />
          )
        ) : (
          <StatCard icon={ListChecks} title="Indicator" value={node.indicator ?? "—"} tone="soft" />
        )}
      </div>

      {node.type === "activity" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={AlertTriangle}
            title="Priority"
            value={PRIORITY_LABELS[node.priority ?? "medium"]}
            tone="soft"
          />
          <StatCard
            icon={Zap}
            title="Status"
            value={PLAN_NODE_STATUS_LABELS[node.status ?? "not_started"]}
            tone={node.status === "delayed" || node.status === "suspended" ? "warning" : "success"}
          />
        </div>
      )}

      {detailRows.length > 0 && (
        <div className="surface-card p-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {detailRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="surface-card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Budget</h2>
          {!budget && (
            <Button size="sm" onClick={() => setBudgetOpen(true)}>
              <Wallet className="size-3.5" /> Request Budget
            </Button>
          )}
        </div>
        {budget ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-semibold text-foreground">
                {budget.requestedAmount.toLocaleString()} {budget.currency}
              </p>
              <Badge
                variant="secondary"
                className={
                  budget.status === "approved"
                    ? "bg-success/12 text-success"
                    : budget.status === "rejected"
                      ? "bg-destructive/12 text-destructive"
                      : budget.status === "queried"
                        ? "bg-warning/12 text-warning"
                        : "bg-muted text-muted-foreground"
                }
              >
                {budget.status === "approved"
                  ? "Fully approved"
                  : budget.status === "rejected"
                    ? "Rejected"
                    : budget.status === "queried"
                      ? "Query pending your response"
                      : "Pending approval"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{budget.description}</p>
            <BudgetChainProgress budget={budget} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate({ to: "/budgets" })}>
                Manage in Budget Approvals
              </Button>
              {budget.status === "approved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ to: "/procurement", search: { budgetId: budget.id } })}
                >
                  Plan Procurement
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No budget requested for this item yet.</p>
        )}
      </div>

      {childType && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {PLAN_NODE_LABELS_PLURAL[childType]} in {node.title}
            </h2>
            <Button size="sm" onClick={openAddChild}>
              <Plus className="size-3.5" /> Add {PLAN_NODE_LABELS[childType]}
            </Button>
          </div>
          <PlanNodeTable
            nodes={children}
            emptyMessage={`No ${PLAN_NODE_LABELS_PLURAL[childType].toLowerCase()} yet.`}
            exportFileName={PLAN_NODE_LABELS_PLURAL[childType].toLowerCase().replace(/ /g, "-")}
          />
        </div>
      )}

      {node.type === "activity" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Tasks under {node.title}</h2>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/tasks/new", search: { activityId: node.id } })}
            >
              <Plus className="size-3.5" /> Add Task
            </Button>
          </div>
          <TaskTable rows={activityTasks} />
        </div>
      )}

      <Dialog open={addChildOpen} onOpenChange={setAddChildOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New {childType ? PLAN_NODE_LABELS[childType] : ""}</DialogTitle>
            <DialogDescription>Add a child item under {node.title}.</DialogDescription>
          </DialogHeader>
          {childType && (
            <PlanNodeFormFields type={childType} value={addForm} onChange={setAddForm} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddChildOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAddChild}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {PLAN_NODE_LABELS[node.type]}</DialogTitle>
          </DialogHeader>
          <PlanNodeFormFields type={node.type} value={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Budget</DialogTitle>
            <DialogDescription>
              Submits this for approval starting from your position in the chain.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="budget-description">What's this for?</Label>
              <Textarea
                id="budget-description"
                rows={3}
                value={budgetDescription}
                onChange={(e) => setBudgetDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget-amount">Amount requested (RWF)</Label>
              <Input
                id="budget-amount"
                type="number"
                min="1"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitBudgetRequest}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${node.title}?`}
        description="Its sub-items (or linked tasks, for an Activity) must be moved or removed first."
        onConfirm={() => {
          const deleted = deletePlanNode(node.id);
          setDeleteOpen(false);
          if (!deleted) return;
          const parent = ancestors[ancestors.length - 1];
          if (parent) {
            navigate({ to: "/objectives/$nodeId", params: { nodeId: parent.id } });
          } else {
            navigate({ to: "/objectives" });
          }
        }}
      />
    </AppShell>
  );
}
