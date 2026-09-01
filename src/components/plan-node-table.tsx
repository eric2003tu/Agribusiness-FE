import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import {
  EMPTY_PLAN_NODE_FORM,
  PlanNodeFormFields,
  type PlanNodeFormState,
} from "@/components/plan-node-form-fields";
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
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import {
  ORG_UNIT_LABELS,
  PLAN_NODE_CHILD_TYPES,
  PLAN_NODE_LABELS,
  PLAN_NODE_STATUS_LABELS,
  PRIORITY_LABELS,
  type PlanNode,
} from "@/lib/mock-data";

interface PlanNodeTableProps {
  nodes: PlanNode[];
  emptyMessage: string;
  exportFileName?: string;
  /** Show each row's immediate parent as a subtitle — useful when nodes span multiple hierarchy levels at once. */
  showParent?: boolean;
}

export function PlanNodeTable({
  nodes,
  emptyMessage,
  exportFileName = "plan-nodes",
  showParent = false,
}: PlanNodeTableProps) {
  const { planNodes, tasks, orgUnitById, memberById, updatePlanNode } = useWorkspace();
  const navigate = useNavigate();
  const [editTarget, setEditTarget] = useState<PlanNode | null>(null);
  const [editForm, setEditForm] = useState<PlanNodeFormState>(EMPTY_PLAN_NODE_FORM);

  const openEdit = (n: PlanNode) => {
    setEditTarget(n);
    setEditForm({
      title: n.title,
      description: n.description,
      responsibleUnitId: n.responsibleUnitId ?? "none",
      ownerId: n.ownerId ?? "none",
      indicator: n.indicator ?? "",
      baseline: n.baseline ?? "",
      target: n.target ?? "",
      strategicPillar: n.strategicPillar ?? "",
      planningPeriod: n.planningPeriod ?? "",
      sourceOfVerification: n.sourceOfVerification ?? "",
      location: n.location ?? "",
      startDate: n.startDate ?? "",
      completionDate: n.completionDate ?? "",
      priority: n.priority ?? "medium",
      status: n.status ?? "not_started",
    });
  };

  const submitEdit = () => {
    if (!editTarget || !editForm.title.trim()) return;
    if (editTarget.type === "activity") {
      const unit =
        editForm.responsibleUnitId !== "none" ? orgUnitById(editForm.responsibleUnitId) : undefined;
      if (!unit || unit.type !== "school") {
        toast.error("Select a responsible school", {
          description: "An activity needs a school so its Dean can assign tasks under it.",
        });
        return;
      }
    }
    updatePlanNode(editTarget.id, {
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
      ...(editTarget.type === "activity"
        ? { priority: editForm.priority, status: editForm.status }
        : {}),
    });
    setEditTarget(null);
  };

  const subItemCount = (n: PlanNode) =>
    n.type === "activity"
      ? tasks.filter((t) => t.activityId === n.id).length
      : planNodes.filter((p) => p.parentId === n.id).length;

  const columns: Array<Column<PlanNode>> = [
    {
      key: "title",
      header: "Title",
      render: (n) => {
        const parent =
          showParent && n.parentId ? planNodes.find((p) => p.id === n.parentId) : undefined;
        return (
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{PLAN_NODE_LABELS[n.type]}</Badge>
              <span className="font-medium text-foreground">{n.title}</span>
            </div>
            {parent && (
              <p className="mt-0.5 text-xs text-muted-foreground">Under: {parent.title}</p>
            )}
          </div>
        );
      },
      exportValue: (n) => n.title,
    },
    {
      key: "responsibleUnit",
      header: "Unit",
      render: (n) => {
        const unit = orgUnitById(n.responsibleUnitId);
        return unit ? (
          <div>
            <span className="text-sm">{unit.name}</span>
            <p className="text-xs text-muted-foreground">{ORG_UNIT_LABELS[unit.type]}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
      exportValue: (n) => orgUnitById(n.responsibleUnitId)?.name ?? "",
    },
    {
      key: "owner",
      header: "Responsible person",
      render: (n) => {
        const owner = memberById(n.ownerId);
        if (!owner) return <span className="text-sm text-muted-foreground">Unassigned</span>;
        return (
          <div className="flex items-center gap-2">
            <UserAvatar member={owner} className="size-6" />
            <div>
              <span className="text-sm text-foreground">{owner.name}</span>
              <p className="text-xs text-muted-foreground">{owner.position ?? owner.title}</p>
            </div>
          </div>
        );
      },
      exportValue: (n) => {
        const owner = memberById(n.ownerId);
        return owner ? `${owner.name} (${owner.position ?? owner.title})` : "";
      },
    },
    {
      key: "indicator",
      header: "Indicator → Target",
      render: (n) =>
        n.indicator ? (
          <span className="text-sm">
            {n.indicator}
            {n.target ? ` → ${n.target}` : ""}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
      exportValue: (n) =>
        n.indicator ? `${n.indicator}${n.target ? ` -> ${n.target}` : ""} ` : "",
    },
    {
      key: "status",
      header: "Status",
      render: (n) =>
        n.type === "activity" ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{PRIORITY_LABELS[n.priority ?? "medium"]}</Badge>
            <Badge variant="outline">{PLAN_NODE_STATUS_LABELS[n.status ?? "not_started"]}</Badge>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
      exportValue: (n) =>
        n.type === "activity" ? PLAN_NODE_STATUS_LABELS[n.status ?? "not_started"] : "",
    },
    {
      key: "subitems",
      header: "Sub-items / Tasks",
      render: (n) => subItemCount(n),
      exportValue: (n) => subItemCount(n),
    },
    {
      key: "actions",
      header: "",
      className: "w-56",
      render: (n) => {
        const childTypes = PLAN_NODE_CHILD_TYPES[n.type];
        const showView = childTypes.length > 0 || n.type === "activity";
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {showView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/objectives/$nodeId", params: { nodeId: n.id } })}
              >
                <Eye className="size-3.5" /> View
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => openEdit(n)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          </div>
        );
      },
      exportValue: () => "",
    },
  ];

  const filters: Array<FilterConfig<PlanNode>> = [
    {
      key: "type",
      label: "Type",
      options: Object.entries(PLAN_NODE_LABELS).map(([value, label]) => ({ value, label })),
      match: (n, v) => n.type === v,
    },
    {
      key: "owner",
      label: "Responsible person",
      options: [
        { value: "has", label: "Assigned" },
        { value: "none", label: "Unassigned" },
      ],
      match: (n, v) => (v === "has" ? !!n.ownerId : !n.ownerId),
    },
  ];

  return (
    <>
      <DataTable
        rows={nodes}
        columns={columns}
        getRowId={(n) => n.id}
        searchFields={(n) => `${n.title} ${n.description}`}
        filters={filters}
        exportFileName={exportFileName}
        emptyMessage={emptyMessage}
        paginate
      />

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editTarget ? PLAN_NODE_LABELS[editTarget.type] : ""}</DialogTitle>
            <DialogDescription>Update this item's details.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <PlanNodeFormFields type={editTarget.type} value={editForm} onChange={setEditForm} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
