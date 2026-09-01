import { useState } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Eye, HelpCircle, PackageSearch, Package, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { MaterialRequestChainProgress } from "@/components/material-request-chain";
import { DataTable, type Column } from "@/components/data-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import {
  MANAGER_ROLES,
  PROCUREMENT_METHOD_LABELS,
  type ApprovalDecision,
  type MaterialRequest,
  type MaterialRequestStatus,
  type ProcurementMethod,
} from "@/lib/mock-data";

export const Route = createFileRoute("/material-requests")({
  head: () => ({
    meta: [
      { title: "Material Requests — TaskFlow" },
      {
        name: "description",
        content: "Approve lecturers' task material plans and send approved ones to procurement.",
      },
    ],
  }),
  component: MaterialRequests,
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

function totalCost(request: MaterialRequest) {
  return request.items.reduce((sum, it) => sum + it.estimatedCost, 0);
}

function MaterialRequests() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
    materialRequests,
    procurementItems,
    tasks: allTasks,
    planNodeById,
    memberById,
    currentUser,
    can,
    currentMaterialRequestApproverId,
    decideMaterialRequestStep,
    sendMaterialRequestToProcurement,
  } = useWorkspace();

  const [decideTarget, setDecideTarget] = useState<{
    request: MaterialRequest;
    decision: Exclude<ApprovalDecision, "pending">;
  } | null>(null);
  const [decideComment, setDecideComment] = useState("");

  const [sendTarget, setSendTarget] = useState<MaterialRequest | null>(null);
  const [method, setMethod] = useState<ProcurementMethod>("quotation");
  const [plannedDate, setPlannedDate] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [fundingSource, setFundingSource] = useState("");

  if (pathname !== "/material-requests") {
    return <Outlet />;
  }

  const isSentToProcurement = (requestId: string) =>
    procurementItems.some((p) => p.materialRequestId === requestId);

  const needsAction = materialRequests.filter(
    (r) =>
      r.status === "pending" &&
      (currentMaterialRequestApproverId(r) === currentUser.id || can("manageTeam")),
  );
  const readyForProcurement = materialRequests.filter(
    (r) => r.status === "approved" && !isSentToProcurement(r.id),
  );

  const openDecide = (request: MaterialRequest, decision: Exclude<ApprovalDecision, "pending">) => {
    setDecideComment("");
    setDecideTarget({ request, decision });
  };

  const confirmDecide = () => {
    if (!decideTarget) return;
    if (decideTarget.decision !== "approved" && !decideComment.trim()) return;
    decideMaterialRequestStep(decideTarget.request.id, decideTarget.decision, decideComment);
    setDecideTarget(null);
  };

  const openSend = (request: MaterialRequest) => {
    setMethod("quotation");
    setPlannedDate("");
    setRequiredDate("");
    setFundingSource("");
    setSendTarget(request);
  };

  const confirmSend = () => {
    if (!sendTarget || !plannedDate || !requiredDate || !fundingSource.trim()) return;
    sendMaterialRequestToProcurement(sendTarget.id, {
      method,
      plannedProcurementDate: plannedDate,
      requiredDeliveryDate: requiredDate,
      fundingSource: fundingSource.trim(),
    });
    setSendTarget(null);
  };

  const taskTitle = (taskId: string) => allTasks.find((t) => t.id === taskId)?.title ?? "—";

  const columns: Array<Column<MaterialRequest>> = [
    {
      key: "task",
      header: "Task",
      render: (r) => (
        <Link
          to="/task/$taskId"
          params={{ taskId: r.taskId }}
          className="text-sm font-medium text-foreground hover:underline"
        >
          {taskTitle(r.taskId)}
        </Link>
      ),
      exportValue: (r) => taskTitle(r.taskId),
    },
    {
      key: "activity",
      header: "Activity",
      render: (r) =>
        r.activityId ? (
          <Link
            to="/objectives/$nodeId"
            params={{ nodeId: r.activityId }}
            className="text-sm text-muted-foreground hover:underline"
          >
            {planNodeById(r.activityId)?.title ?? "—"}
          </Link>
        ) : (
          "—"
        ),
      exportValue: (r) => (r.activityId ? (planNodeById(r.activityId)?.title ?? "") : ""),
    },
    {
      key: "total",
      header: "Total cost",
      render: (r) => totalCost(r).toLocaleString(),
      exportValue: (r) => totalCost(r),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant="secondary" className={STATUS_BADGE[r.status]}>
          {STATUS_LABEL[r.status]}
        </Badge>
      ),
      exportValue: (r) => STATUS_LABEL[r.status],
    },
    {
      key: "procurement",
      header: "",
      render: (r) =>
        isSentToProcurement(r.id) ? (
          <Link to="/procurement" className="text-sm text-primary hover:underline">
            View in procurement
          </Link>
        ) : null,
      exportValue: () => "",
    },
    {
      key: "creator",
      header: "Lecturer",
      render: (r) => memberById(r.createdById)?.name ?? "—",
      exportValue: (r) => memberById(r.createdById)?.name ?? "",
    },
    {
      key: "createdAt",
      header: "Submitted",
      render: (r) => r.createdAt,
      exportValue: (r) => r.createdAt,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/material-requests/$requestId" params={{ requestId: r.id }}>
            <Eye className="size-3.5" /> View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES, "staff"]}
      title="Material Requests"
      description="Lecturers' task material plans, climbing HOD, Dean and Principal before heading to procurement."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Package}
          title="Needs your action"
          value={needsAction.length}
          tone="brand"
        />
        <StatCard
          icon={PackageSearch}
          title="Ready for procurement"
          value={readyForProcurement.length}
          tone="soft"
        />
        <StatCard
          icon={CheckCircle2}
          title="Sent to procurement"
          value={materialRequests.filter((r) => isSentToProcurement(r.id)).length}
          tone="success"
        />
      </div>

      {needsAction.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Needs your action</h2>
          <div className="space-y-3">
            {needsAction.map((r) => (
              <div key={r.id} className="surface-card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/task/$taskId"
                      params={{ taskId: r.taskId }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {taskTitle(r.taskId)}
                    </Link>
                    {r.activityId && (
                      <p className="text-xs text-muted-foreground">
                        {planNodeById(r.activityId)?.title}
                      </p>
                    )}
                    <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                      {r.items.map((it) => (
                        <li key={it.id}>
                          {it.quantity}x {it.item} — {it.estimatedCost.toLocaleString()} RWF
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      Total: {totalCost(r).toLocaleString()} RWF
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/material-requests/$requestId" params={{ requestId: r.id }}>
                        <Eye className="size-3.5" /> View
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDecide(r, "rejected")}
                    >
                      <XCircle className="size-3.5" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDecide(r, "queried")}>
                      <HelpCircle className="size-3.5" /> Query
                    </Button>
                    <Button size="sm" onClick={() => openDecide(r, "approved")}>
                      <CheckCircle2 className="size-3.5" /> Approve
                    </Button>
                  </div>
                </div>
                <MaterialRequestChainProgress request={r} />
              </div>
            ))}
          </div>
        </div>
      )}

      {readyForProcurement.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Ready for procurement</h2>
          <div className="space-y-3">
            {readyForProcurement.map((r) => (
              <div key={r.id} className="surface-card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/task/$taskId"
                      params={{ taskId: r.taskId }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {taskTitle(r.taskId)}
                    </Link>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      Total: {totalCost(r).toLocaleString()} RWF
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/material-requests/$requestId" params={{ requestId: r.id }}>
                        <Eye className="size-3.5" /> View
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => openSend(r)}>
                      <PackageSearch className="size-3.5" /> Send to Procurement
                    </Button>
                  </div>
                </div>
                <MaterialRequestChainProgress request={r} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          All material requests visible to you
        </h2>
        <DataTable
          rows={materialRequests}
          columns={columns}
          getRowId={(r) => r.id}
          searchFields={(r) => `${taskTitle(r.taskId)} ${memberById(r.createdById)?.name ?? ""}`}
          exportFileName="material-requests"
          emptyMessage="No material requests visible to you yet."
        />
      </div>

      <Dialog open={!!decideTarget} onOpenChange={(o) => !o && setDecideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decideTarget?.decision === "approved"
                ? "Approve this request?"
                : decideTarget?.decision === "rejected"
                  ? "Reject this request?"
                  : "Query this request?"}
            </DialogTitle>
            <DialogDescription>
              {decideTarget?.decision === "approved"
                ? "It will move to the next step in the chain."
                : "A comment is required so the lecturer knows why."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="mr-decide-comment">
              Comment {decideTarget?.decision !== "approved" && "*"}
            </Label>
            <Textarea
              id="mr-decide-comment"
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

      <Dialog open={!!sendTarget} onOpenChange={(o) => !o && setSendTarget(null)}>
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
                <Label htmlFor="mr-planned-date">Planned procurement date</Label>
                <Input
                  id="mr-planned-date"
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mr-required-date">Required delivery date</Label>
                <Input
                  id="mr-required-date"
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mr-funding-source">Funding source</Label>
              <Input
                id="mr-funding-source"
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmSend}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
