import { useState } from "react";
import { ArrowLeft, CheckCircle2, HelpCircle, PackageSearch, XCircle } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MaterialRequestChainProgress } from "@/components/material-request-chain";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import {
  APPROVAL_STEP_LABELS,
  MANAGER_ROLES,
  PROCUREMENT_METHOD_LABELS,
  type ApprovalDecision,
  type MaterialRequestStatus,
  type ProcurementMethod,
} from "@/lib/mock-data";

export const Route = createFileRoute("/material-requests/$requestId")({
  head: () => ({
    meta: [{ title: "Material request details — TaskFlow" }],
  }),
  component: MaterialRequestDetail,
});

const STATUS_BADGE: Record<MaterialRequestStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-success/12 text-success",
  rejected: "bg-destructive/12 text-destructive",
  queried: "bg-warning/12 text-warning",
};

const STATUS_LABEL: Record<MaterialRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  queried: "Queried",
};

const DECISION_LABEL: Record<string, string> = {
  approved: "approved",
  rejected: "rejected",
  queried: "queried",
  pending: "submitted",
};

function MaterialRequestDetail() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const {
    materialRequests,
    procurementItems,
    tasks: allTasks,
    planNodeById,
    memberById,
    currentUser,
    currentMaterialRequestApproverId,
    decideMaterialRequestStep,
    sendMaterialRequestToProcurement,
  } = useWorkspace();

  const [decideTarget, setDecideTarget] = useState<Exclude<ApprovalDecision, "pending"> | null>(
    null,
  );
  const [decideComment, setDecideComment] = useState("");

  const [sendOpen, setSendOpen] = useState(false);
  const [method, setMethod] = useState<ProcurementMethod>("quotation");
  const [plannedDate, setPlannedDate] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [fundingSource, setFundingSource] = useState("");

  const request = materialRequests.find((r) => r.id === requestId);
  // Finance can view this one request for context (linked from Requisitions)
  // but doesn't have the Material Requests list or Procurement pages — send
  // them back to somewhere they can actually reach instead of a dead end.
  const backTo = currentUser.role === "finance" ? "/requisitions" : "/material-requests";
  const backLabel =
    currentUser.role === "finance" ? "Back to Requisitions" : "Back to Material Requests";

  if (!request) {
    return (
      <AppShell
        allowedRoles={["admin", ...MANAGER_ROLES, "staff", "finance"]}
        title="Not found"
        description="This material request no longer exists or isn't visible to you."
      >
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">It may have been deleted.</p>
          <Button className="mt-4" onClick={() => navigate({ to: backTo })}>
            {backLabel}
          </Button>
        </div>
      </AppShell>
    );
  }

  const task = allTasks.find((t) => t.id === request.taskId);
  const totalCost = request.items.reduce((sum, it) => sum + it.estimatedCost, 0);
  const isApprover =
    request.status === "pending" && currentMaterialRequestApproverId(request) === currentUser.id;
  const isSentToProcurement = procurementItems.some((p) => p.materialRequestId === request.id);
  const canSendManager =
    request.status === "approved" &&
    !isSentToProcurement &&
    (currentUser.role === "admin" || MANAGER_ROLES.includes(currentUser.role));

  const openDecide = (decision: Exclude<ApprovalDecision, "pending">) => {
    setDecideComment("");
    setDecideTarget(decision);
  };

  const confirmDecide = () => {
    if (!decideTarget) return;
    if (decideTarget !== "approved" && !decideComment.trim()) return;
    decideMaterialRequestStep(request.id, decideTarget, decideComment);
    setDecideTarget(null);
  };

  const openSend = () => {
    setMethod("quotation");
    setPlannedDate("");
    setRequiredDate("");
    setFundingSource("");
    setSendOpen(true);
  };

  const confirmSend = () => {
    if (!plannedDate || !requiredDate || !fundingSource.trim()) return;
    sendMaterialRequestToProcurement(request.id, {
      method,
      plannedProcurementDate: plannedDate,
      requiredDeliveryDate: requiredDate,
      fundingSource: fundingSource.trim(),
    });
    setSendOpen(false);
  };

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES, "staff", "finance"]}
      title={task?.title ?? "Material request"}
      description={`${totalCost.toLocaleString()} RWF — submitted by ${memberById(request.createdById)?.name ?? "—"}`}
      actions={
        isSentToProcurement && currentUser.role !== "finance" ? (
          <Button asChild variant="outline">
            <Link to="/procurement">View in Procurement</Link>
          </Button>
        ) : canSendManager ? (
          <Button onClick={openSend}>
            <PackageSearch className="size-4" /> Send to Procurement
          </Button>
        ) : undefined
      }
    >
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => navigate({ to: backTo })}
      >
        <ArrowLeft className="size-4" /> {backLabel}
      </Button>

      <div className="surface-card space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {task && (
              <Link
                to="/task/$taskId"
                params={{ taskId: task.id }}
                className="text-sm text-primary hover:underline"
              >
                {task.title}
              </Link>
            )}
            {request.activityId && (
              <Link
                to="/objectives/$nodeId"
                params={{ nodeId: request.activityId }}
                className="mt-0.5 block text-xs text-muted-foreground hover:underline"
              >
                {planNodeById(request.activityId)?.title}
              </Link>
            )}
          </div>
          <Badge variant="secondary" className={STATUS_BADGE[request.status]}>
            {STATUS_LABEL[request.status]}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Materials</h2>
          <ul className="divide-y divide-border rounded-lg border">
            {request.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-foreground">
                  {it.quantity}x {it.item}
                </span>
                <span className="text-muted-foreground">
                  {it.estimatedCost.toLocaleString()} RWF
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-foreground">
            Total: {totalCost.toLocaleString()} RWF
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Current step</h2>
            <p className="mt-1.5 text-sm text-foreground">
              {APPROVAL_STEP_LABELS[request.steps[request.currentStepIndex]?.role ?? "hod"]}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Lecturer</h2>
            <p className="mt-1.5 text-sm text-foreground">
              {memberById(request.createdById)?.name ?? "—"}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Submitted</h2>
            <p className="mt-1.5 text-sm text-foreground">{request.createdAt}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Approval chain</h2>
          <MaterialRequestChainProgress request={request} />
        </div>

        {isApprover && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
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
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">History</h2>
          <ul className="space-y-3">
            {request.events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <div>
                  <p className="text-foreground">
                    <span className="font-medium">{memberById(e.actorId)?.name ?? "—"}</span>{" "}
                    {DECISION_LABEL[e.decision] ?? e.decision} as {APPROVAL_STEP_LABELS[e.role]}
                  </p>
                  {e.comment && <p className="text-muted-foreground">{e.comment}</p>}
                  <p className="text-xs text-muted-foreground">{e.timestamp}</p>
                </div>
              </li>
            ))}
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
                : "A comment is required so the lecturer knows why."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="mr-detail-decide-comment">
              Comment {decideTarget !== "approved" && "*"}
            </Label>
            <Textarea
              id="mr-detail-decide-comment"
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

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Procurement</DialogTitle>
            <DialogDescription>
              Creates a procurement item for each material line and raises a requisition for Finance
              to decide.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Procurement method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as ProcurementMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROCUREMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="mr-detail-planned-date">Planned procurement date</Label>
                <Input
                  id="mr-detail-planned-date"
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mr-detail-required-date">Required delivery date</Label>
                <Input
                  id="mr-detail-required-date"
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mr-detail-funding-source">Funding source</Label>
              <Input
                id="mr-detail-funding-source"
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSend}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
