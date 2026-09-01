import { useState } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Eye, HelpCircle, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { BudgetChainProgress } from "@/components/budget-chain";
import { DataTable, type Column } from "@/components/data-table";
import { SearchableSelect } from "@/components/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  APPROVAL_STEP_LABELS,
  MANAGER_ROLES,
  type Budget,
  type BudgetStatus,
} from "@/lib/mock-data";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Budget Approvals — TaskFlow" },
      {
        name: "description",
        content: "See every budget request in your part of the chain; open one to decide.",
      },
    ],
  }),
  component: BudgetApprovals,
});

const STATUS_BADGE: Record<BudgetStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-success/12 text-success",
  rejected: "bg-destructive/12 text-destructive",
  queried: "bg-warning/12 text-warning",
};

const STATUS_LABEL: Record<BudgetStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  queried: "Queried",
};

function BudgetApprovals() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
    budgets,
    planNodeById,
    memberById,
    currentUser,
    currentApproverId,
    planNodes,
    submitBudget,
    can,
    setBudgetDisbursed,
  } = useWorkspace();

  const [newOpen, setNewOpen] = useState(false);
  const [newPlanNodeId, setNewPlanNodeId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");

  if (pathname !== "/budgets") {
    return <Outlet />;
  }

  const needsAction = budgets.filter(
    (b) => b.status === "pending" && currentApproverId(b) === currentUser.id,
  );
  const submittedByMe = budgets.filter((b) => b.createdById === currentUser.id);
  const pendingCount = needsAction.length;
  const totalPending = budgets.filter((b) => b.status === "pending").length;
  const approvedCount = budgets.filter((b) => b.status === "approved").length;

  const submitNewBudget = () => {
    const amount = Number(newAmount);
    if (!newPlanNodeId || !newDescription.trim() || !amount || amount <= 0) return;
    submitBudget({
      planNodeId: newPlanNodeId,
      description: newDescription.trim(),
      requestedAmount: amount,
    });
    setNewOpen(false);
    setNewPlanNodeId("");
    setNewDescription("");
    setNewAmount("");
  };

  const columns: Array<Column<Budget>> = [
    {
      key: "node",
      header: "For",
      render: (b) => (
        <Link
          to="/objectives/$nodeId"
          params={{ nodeId: b.planNodeId }}
          className="text-sm font-medium text-foreground hover:underline"
        >
          {planNodeById(b.planNodeId)?.title ?? "—"}
        </Link>
      ),
      exportValue: (b) => planNodeById(b.planNodeId)?.title ?? "",
    },
    {
      key: "amount",
      header: "Amount",
      render: (b) => `${b.requestedAmount.toLocaleString()} ${b.currency}`,
      exportValue: (b) => b.requestedAmount,
    },
    {
      key: "step",
      header: "Current step",
      render: (b) => APPROVAL_STEP_LABELS[b.steps[b.currentStepIndex]?.role ?? "finance"],
      exportValue: (b) => APPROVAL_STEP_LABELS[b.steps[b.currentStepIndex]?.role ?? "finance"],
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <Badge variant="secondary" className={STATUS_BADGE[b.status]}>
          {STATUS_LABEL[b.status]}
        </Badge>
      ),
      exportValue: (b) => STATUS_LABEL[b.status],
    },
    {
      key: "procurement",
      header: "",
      render: (b) =>
        b.status === "approved" && currentUser.role !== "finance" ? (
          <Link
            to="/procurement"
            search={{ budgetId: b.id }}
            className="text-sm text-primary hover:underline"
          >
            Plan procurement
          </Link>
        ) : null,
      exportValue: () => "",
    },
    ...(currentUser.role === "finance" || can("manageTeam")
      ? [
          {
            key: "disbursed",
            header: "Disbursed",
            render: (b: Budget) =>
              b.status === "approved" ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={b.disbursed}
                    onCheckedChange={(v) => setBudgetDisbursed(b.id, v)}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              ),
            exportValue: (b: Budget) => (b.disbursed ? "Yes" : "No"),
          } satisfies Column<Budget>,
        ]
      : []),
    {
      key: "creator",
      header: "Submitted by",
      render: (b) => memberById(b.createdById)?.name ?? "—",
      exportValue: (b) => memberById(b.createdById)?.name ?? "",
    },
    {
      key: "createdAt",
      header: "Submitted",
      render: (b) => b.createdAt,
      exportValue: (b) => b.createdAt,
    },
    {
      key: "actions",
      header: "",
      render: (b) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/budgets/$budgetId" params={{ budgetId: b.id }}>
            <Eye className="size-3.5" /> View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES, "finance"]}
      title="Budget Approvals"
      description="See every budget request in your part of the chain; open one to decide."
      actions={
        <Button onClick={() => setNewOpen(true)}>
          <Wallet className="size-4" /> New Budget Request
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} title="Needs your action" value={pendingCount} tone="brand" />
        <StatCard
          icon={HelpCircle}
          title="Pending institution-wide"
          value={totalPending}
          tone="soft"
        />
        <StatCard icon={CheckCircle2} title="Fully approved" value={approvedCount} tone="success" />
      </div>

      {needsAction.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Needs your action</h2>
          <div className="space-y-3">
            {needsAction.map((b) => (
              <div key={b.id} className="surface-card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/objectives/$nodeId"
                      params={{ nodeId: b.planNodeId }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {planNodeById(b.planNodeId)?.title ?? "—"}
                    </Link>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {b.requestedAmount.toLocaleString()} {b.currency}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/budgets/$budgetId" params={{ budgetId: b.id }}>
                      <Eye className="size-3.5" /> View &amp; decide
                    </Link>
                  </Button>
                </div>
                <BudgetChainProgress budget={b} />
              </div>
            ))}
          </div>
        </div>
      )}

      {submittedByMe.some((b) => b.status === "queried") && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Awaiting your response</h2>
          <div className="space-y-3">
            {submittedByMe
              .filter((b) => b.status === "queried")
              .map((b) => {
                const lastEvent = b.events[b.events.length - 1];
                return (
                  <div key={b.id} className="surface-card space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/objectives/$nodeId"
                          params={{ nodeId: b.planNodeId }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {planNodeById(b.planNodeId)?.title ?? "—"}
                        </Link>
                        <p className="mt-1 text-sm text-warning">{lastEvent?.comment}</p>
                      </div>
                      <Button asChild size="sm">
                        <Link to="/budgets/$budgetId" params={{ budgetId: b.id }}>
                          <Eye className="size-3.5" /> View &amp; respond
                        </Link>
                      </Button>
                    </div>
                    <BudgetChainProgress budget={b} />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">All budgets visible to you</h2>
        <DataTable
          rows={budgets}
          columns={columns}
          getRowId={(b) => b.id}
          searchFields={(b) => `${planNodeById(b.planNodeId)?.title ?? ""} ${b.description}`}
          exportFileName="budgets"
          emptyMessage="No budgets visible to you yet."
        />
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Budget Request</DialogTitle>
            <DialogDescription>
              Submits for approval starting from your position in the chain.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>For</Label>
              <SearchableSelect
                value={newPlanNodeId}
                onValueChange={setNewPlanNodeId}
                placeholder="Select an objective, output or activity..."
                searchPlaceholder="Search by title..."
                emptyMessage="No items found."
                options={planNodes.map((n) => ({ value: n.id, label: n.title, keywords: n.title }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-budget-description">What's this for?</Label>
              <Textarea
                id="new-budget-description"
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-budget-amount">Amount requested (RWF)</Label>
              <Input
                id="new-budget-amount"
                type="number"
                min="1"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNewBudget}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
