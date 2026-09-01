import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eye, HandCoins, HelpCircle, Plus, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { MaterialRequestChainProgress } from "@/components/material-request-chain";
import { DataTable, type Column } from "@/components/data-table";
import { SearchableSelect } from "@/components/searchable-select";
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
import { MANAGER_ROLES, type Requisition } from "@/lib/mock-data";

export const Route = createFileRoute("/requisitions")({
  head: () => ({
    meta: [
      { title: "Requisitions — TaskFlow" },
      {
        name: "description",
        content: "Raise and decide requisitions for funds against planned procurement items.",
      },
    ],
  }),
  component: Requisitions,
});

const STATUS_BADGE: Record<Requisition["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-success/12 text-success",
  rejected: "bg-destructive/12 text-destructive",
};

const STATUS_LABEL: Record<Requisition["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function Requisitions() {
  const {
    requisitions,
    procurementItems,
    materialRequests,
    memberById,
    orgUnitById,
    currentUser,
    can,
    submitRequisition,
    decideRequisition,
  } = useWorkspace();

  const [newOpen, setNewOpen] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const [decideTarget, setDecideTarget] = useState<{
    requisition: Requisition;
    decision: "approved" | "rejected";
  } | null>(null);
  const [decideComment, setDecideComment] = useState("");

  const materialRequestFor = (procurementItemId: string) => {
    const item = procurementItems.find((p) => p.id === procurementItemId);
    return item?.materialRequestId
      ? materialRequests.find((r) => r.id === item.materialRequestId)
      : undefined;
  };

  // Mirrors decideRequisition's own authorization exactly: material-request
  // items route to whoever holds the "finance" role; budget-derived items
  // route to the item's responsible-unit manager; admin/principal bypass both.
  const canDecideRequisition = (r: Requisition) => {
    if (r.status !== "pending") return false;
    if (can("manageTeam")) return true;
    const item = procurementItems.find((p) => p.id === r.procurementItemId);
    if (item?.materialRequestId) return currentUser.role === "finance";
    return (
      !!item?.responsibleUnitId && orgUnitById(item.responsibleUnitId)?.managerId === currentUser.id
    );
  };

  const needsAction = requisitions.filter(canDecideRequisition);

  const openNew = () => {
    setNewItemId("");
    setNewAmount("");
    setNewOpen(true);
  };

  const confirmNew = () => {
    const amount = Number(newAmount);
    if (!newItemId || !amount || amount <= 0) return;
    submitRequisition({ procurementItemId: newItemId, amount });
    setNewOpen(false);
  };

  const openDecide = (requisition: Requisition, decision: "approved" | "rejected") => {
    setDecideComment("");
    setDecideTarget({ requisition, decision });
  };

  const confirmDecide = () => {
    if (!decideTarget) return;
    if (decideTarget.decision === "rejected" && !decideComment.trim()) return;
    decideRequisition(decideTarget.requisition.id, decideTarget.decision, decideComment);
    setDecideTarget(null);
  };

  const columns: Array<Column<Requisition>> = [
    {
      key: "item",
      header: "For",
      render: (r) => {
        const item = procurementItems.find((p) => p.id === r.procurementItemId);
        const materialRequest = materialRequestFor(r.procurementItemId);
        return (
          <div>
            <p className="text-sm font-medium text-foreground">{item?.item ?? "—"}</p>
            {materialRequest && (
              <Link
                to="/material-requests/$requestId"
                params={{ requestId: materialRequest.id }}
                className="text-xs text-primary hover:underline"
              >
                From a material request
              </Link>
            )}
          </div>
        );
      },
      exportValue: (r) => procurementItems.find((p) => p.id === r.procurementItemId)?.item ?? "",
    },
    {
      key: "amount",
      header: "Amount",
      render: (r) => `${r.amount.toLocaleString()} RWF`,
      exportValue: (r) => r.amount,
    },
    {
      key: "requester",
      header: "Requested by",
      render: (r) => memberById(r.requestedById)?.name ?? "—",
      exportValue: (r) => memberById(r.requestedById)?.name ?? "",
    },
    {
      key: "approver",
      header: "Approver",
      render: (r) => memberById(r.approverId)?.name ?? "—",
      exportValue: (r) => memberById(r.approverId)?.name ?? "",
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
      key: "comment",
      header: "Comment",
      render: (r) => r.comment ?? "—",
      exportValue: (r) => r.comment ?? "",
    },
    {
      key: "actions",
      header: "",
      render: (r) => {
        if (!canDecideRequisition(r)) return null;
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => openDecide(r, "rejected")}
            >
              <XCircle className="size-3.5" /> Reject
            </Button>
            <Button size="sm" onClick={() => openDecide(r, "approved")}>
              <CheckCircle2 className="size-3.5" /> Approve
            </Button>
          </div>
        );
      },
      exportValue: () => "",
    },
  ];

  const itemOptions = procurementItems.map((p) => ({
    value: p.id,
    label: `${p.item} — ${p.estimatedCost.toLocaleString()} RWF`,
    keywords: p.item,
  }));

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES, "finance"]}
      title="Requisitions"
      description="Raise and decide requests for funds against planned procurement items."
      actions={
        <Button onClick={openNew} disabled={procurementItems.length === 0}>
          <Plus className="size-4" /> New Requisition
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={HandCoins}
          title="Needs your action"
          value={needsAction.length}
          tone="brand"
        />
        <StatCard
          icon={HelpCircle}
          title="Pending institution-wide"
          value={requisitions.filter((r) => r.status === "pending").length}
          tone="soft"
        />
        <StatCard
          icon={CheckCircle2}
          title="Approved"
          value={requisitions.filter((r) => r.status === "approved").length}
          tone="success"
        />
      </div>

      {needsAction.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Needs your action</h2>
          <div className="space-y-3">
            {needsAction.map((r) => {
              const item = procurementItems.find((p) => p.id === r.procurementItemId);
              const materialRequest = materialRequestFor(r.procurementItemId);
              return (
                <div key={r.id} className="surface-card space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item?.item ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.amount.toLocaleString()} RWF — requested by{" "}
                        {memberById(r.requestedById)?.name ?? "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {materialRequest && (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/material-requests/$requestId"
                            params={{ requestId: materialRequest.id }}
                          >
                            <Eye className="size-3.5" /> View
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDecide(r, "rejected")}
                      >
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => openDecide(r, "approved")}>
                        <CheckCircle2 className="size-3.5" /> Approve
                      </Button>
                    </div>
                  </div>
                  {materialRequest && (
                    <div>
                      <p className="mb-1.5 text-xs text-muted-foreground">
                        Approved from department up to procurement:
                      </p>
                      <MaterialRequestChainProgress request={materialRequest} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">All requisitions</h2>
        <DataTable
          rows={requisitions}
          columns={columns}
          getRowId={(r) => r.id}
          searchFields={(r) =>
            procurementItems.find((p) => p.id === r.procurementItemId)?.item ?? ""
          }
          exportFileName="requisitions"
          emptyMessage="No requisitions raised yet."
        />
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Requisition</DialogTitle>
            <DialogDescription>
              Sends a request for funds to the responsible unit's manager (or Finance, for
              material-request items).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Procurement item</Label>
              <SearchableSelect
                value={newItemId}
                onValueChange={(v) => {
                  setNewItemId(v);
                  const item = procurementItems.find((p) => p.id === v);
                  if (item) setNewAmount(String(item.estimatedCost));
                }}
                placeholder="Select a procurement item..."
                searchPlaceholder="Search items..."
                emptyMessage="No procurement items found."
                options={itemOptions}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-req-amount">Amount (RWF)</Label>
              <Input
                id="new-req-amount"
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
            <Button onClick={confirmNew}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decideTarget} onOpenChange={(o) => !o && setDecideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decideTarget?.decision === "approved"
                ? "Approve this requisition?"
                : "Reject this requisition?"}
            </DialogTitle>
            <DialogDescription>
              {decideTarget?.decision === "approved"
                ? "Funds will be marked approved."
                : "A comment is required so the requester knows why."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="decide-req-comment">
              Comment {decideTarget?.decision === "rejected" && "*"}
            </Label>
            <Textarea
              id="decide-req-comment"
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
    </AppShell>
  );
}
