import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StatCard, type StatCardProps } from "@/components/stat-card";
import { BudgetChainProgress } from "@/components/budget-chain";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/lib/workspace-store";
import {
  APPROVAL_STEP_LABELS,
  MANAGER_ROLES,
  PLAN_NODE_LABELS,
  type ApprovalDecision,
  type BudgetStatus,
} from "@/lib/mock-data";

export const Route = createFileRoute("/budgets/$budgetId")({
  head: () => ({
    meta: [{ title: "Budget details — TaskFlow" }],
  }),
  component: BudgetDetail,
});

const STATUS_LABEL: Record<BudgetStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  queried: "Queried",
};

const STATUS_TONE: Record<BudgetStatus, StatCardProps["tone"]> = {
  pending: "soft",
  approved: "success",
  rejected: "danger",
  queried: "warning",
};

const DECISION_LABEL: Record<string, string> = {
  approved: "approved",
  rejected: "rejected",
  queried: "queried",
  pending: "submitted",
};

const EVENT_ICON: Record<string, LucideIcon> = {
  approved: CheckCircle2,
  rejected: XCircle,
  queried: HelpCircle,
  pending: Clock,
};

const EVENT_COLOR: Record<string, string> = {
  approved: "text-success",
  rejected: "text-destructive",
  queried: "text-warning",
  pending: "text-muted-foreground",
};

function BudgetDetail() {
  const { budgetId } = Route.useParams();
  const navigate = useNavigate();
  const {
    budgets,
    planNodeById,
    memberById,
    currentUser,
    currentApproverId,
    decideBudgetStep,
    resubmitBudget,
    can,
    setBudgetDisbursed,
  } = useWorkspace();

  const [decideTarget, setDecideTarget] = useState<Exclude<ApprovalDecision, "pending"> | null>(
    null,
  );
  const [decideComment, setDecideComment] = useState("");
  const [respondOpen, setRespondOpen] = useState(false);
  const [respondComment, setRespondComment] = useState("");
  const [respondAmount, setRespondAmount] = useState("");

  const budget = budgets.find((b) => b.id === budgetId);

  if (!budget) {
    return (
      <AppShell
        allowedRoles={["admin", ...MANAGER_ROLES, "finance"]}
        title="Not found"
        description="This budget request no longer exists or isn't visible to you."
      >
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">It may have been deleted.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/budgets" })}>
            Back to Budget Approvals
          </Button>
        </div>
      </AppShell>
    );
  }

  const node = planNodeById(budget.planNodeId);
  const isApprover = budget.status === "pending" && currentApproverId(budget) === currentUser.id;
  const canRespond = budget.status === "queried" && budget.createdById === currentUser.id;
  const canManageDisbursement =
    budget.status === "approved" && (currentUser.role === "finance" || can("manageTeam"));

  const openDecide = (decision: Exclude<ApprovalDecision, "pending">) => {
    setDecideComment("");
    setDecideTarget(decision);
  };

  const confirmDecide = () => {
    if (!decideTarget) return;
    if (decideTarget !== "approved" && !decideComment.trim()) return;
    decideBudgetStep(budget.id, decideTarget, decideComment);
    setDecideTarget(null);
  };

  const openRespond = () => {
    setRespondComment("");
    setRespondAmount(String(budget.requestedAmount));
    setRespondOpen(true);
  };

  const confirmRespond = () => {
    if (!respondComment.trim()) return;
    const amount = Number(respondAmount);
    resubmitBudget(budget.id, {
      comment: respondComment.trim(),
      ...(amount && amount !== budget.requestedAmount ? { requestedAmount: amount } : {}),
    });
    setRespondOpen(false);
  };

  const currentStep = budget.steps[budget.currentStepIndex];
  const currentStepLabel = APPROVAL_STEP_LABELS[currentStep?.role ?? "finance"];
  const liveApproverName = memberById(currentApproverId(budget))?.name;
  const stepHint =
    budget.status === "approved"
      ? "Fully approved"
      : budget.status === "rejected"
        ? "No further action"
        : budget.status === "queried"
          ? canRespond
            ? "Awaiting your response"
            : "Awaiting the requester's response"
          : isApprover
            ? "Waiting on you"
            : liveApproverName
              ? `Waiting on ${liveApproverName}`
              : undefined;

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES, "finance"]}
      title={node?.title ?? "Budget request"}
      description={`${budget.requestedAmount.toLocaleString()} ${budget.currency} — submitted by ${memberById(budget.createdById)?.name ?? "—"}`}
      actions={
        budget.status === "approved" && currentUser.role !== "finance" ? (
          <Button asChild variant="outline">
            <Link to="/procurement" search={{ budgetId: budget.id }}>
              Plan Procurement
            </Link>
          </Button>
        ) : undefined
      }
    >
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => navigate({ to: "/budgets" })}
      >
        <ArrowLeft className="size-4" /> Back to Budget Approvals
      </Button>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          title="Requested amount"
          value={`${budget.requestedAmount.toLocaleString()} ${budget.currency}`}
          tone="brand"
        />
        <StatCard
          icon={
            budget.status === "approved"
              ? CheckCircle2
              : budget.status === "rejected"
                ? XCircle
                : budget.status === "queried"
                  ? HelpCircle
                  : Clock
          }
          title="Status"
          value={STATUS_LABEL[budget.status]}
          tone={STATUS_TONE[budget.status]}
        />
        <StatCard
          icon={Clock}
          title="Current step"
          value={currentStepLabel}
          tone="soft"
          hint={stepHint}
        />
      </div>

      <div className="surface-card space-y-6 p-6">
        <div className="space-y-2">
          <p className="text-sm text-foreground">{budget.description}</p>
          {node && (
            <Link
              to="/objectives/$nodeId"
              params={{ nodeId: node.id }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              <FileText className="size-3.5" />
              {PLAN_NODE_LABELS[node.type]}: {node.title}
              <ArrowUpRight className="size-3" />
            </Link>
          )}
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <p className="text-muted-foreground">
              Submitted by{" "}
              <span className="text-foreground">{memberById(budget.createdById)?.name ?? "—"}</span>
            </p>
            <p className="text-muted-foreground">
              on <span className="text-foreground">{budget.createdAt}</span>
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Approval chain</h2>
          <BudgetChainProgress budget={budget} />
        </div>

        {canManageDisbursement && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">Disbursed</h2>
                <p className="text-xs text-muted-foreground">
                  Finance bookkeeping only — doesn't affect the approval chain.
                </p>
              </div>
              <Switch
                checked={budget.disbursed}
                onCheckedChange={(v) => setBudgetDisbursed(budget.id, v)}
              />
            </div>
          </>
        )}

        {(isApprover || canRespond) && (
          <>
            <Separator />
            <div className="flex flex-col gap-3 rounded-lg border border-l-4 border-l-primary bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-foreground">
                {isApprover
                  ? "This is waiting on your decision."
                  : "You queried this — respond once you've addressed it."}
              </p>
              <div className="flex flex-wrap gap-2">
                {isApprover && (
                  <>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDecide("rejected")}
                    >
                      <XCircle className="size-4" /> Reject
                    </Button>
                    <Button variant="outline" onClick={() => openDecide("queried")}>
                      <HelpCircle className="size-4" /> Query
                    </Button>
                    <Button onClick={() => openDecide("approved")}>
                      <CheckCircle2 className="size-4" /> Approve
                    </Button>
                  </>
                )}
                {canRespond && <Button onClick={openRespond}>Respond to query</Button>}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">History</h2>
          <ul className="space-y-4">
            {budget.events.map((e) => {
              const EventIcon = EVENT_ICON[e.decision] ?? Clock;
              return (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <EventIcon
                    className={`mt-0.5 size-4 shrink-0 ${EVENT_COLOR[e.decision] ?? "text-muted-foreground"}`}
                  />
                  <div>
                    <p className="text-foreground">
                      <span className="font-medium">{memberById(e.actorId)?.name ?? "—"}</span>{" "}
                      {DECISION_LABEL[e.decision] ?? e.decision} as {APPROVAL_STEP_LABELS[e.role]}
                    </p>
                    {e.comment && <p className="text-muted-foreground">{e.comment}</p>}
                    <p className="text-xs text-muted-foreground">{e.timestamp}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Dialog open={!!decideTarget} onOpenChange={(o) => !o && setDecideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decideTarget === "approved"
                ? "Approve this request?"
                : decideTarget === "rejected"
                  ? "Reject this request?"
                  : "Query this request?"}
            </DialogTitle>
            <DialogDescription>
              {decideTarget === "approved"
                ? "It will move to the next step in the chain."
                : "A comment is required so the requester knows why."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="detail-decide-comment">
              Comment {decideTarget !== "approved" && "*"}
            </Label>
            <Textarea
              id="detail-decide-comment"
              rows={3}
              value={decideComment}
              onChange={(e) => setDecideComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDecide}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to query</DialogTitle>
            <DialogDescription>
              Changing the amount restarts the approval chain from the beginning.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="detail-respond-amount">Amount requested (RWF)</Label>
              <Input
                id="detail-respond-amount"
                type="number"
                min="1"
                value={respondAmount}
                onChange={(e) => setRespondAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail-respond-comment">Your response *</Label>
              <Textarea
                id="detail-respond-comment"
                rows={3}
                value={respondComment}
                onChange={(e) => setRespondComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRespond}>Resubmit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
