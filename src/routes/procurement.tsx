import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Package, PackageSearch, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
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
  ORG_UNIT_LABELS,
  PROCUREMENT_METHOD_LABELS,
  PROCUREMENT_STATUS_LABELS,
  type ProcurementItem,
  type ProcurementMethod,
} from "@/lib/mock-data";

export const Route = createFileRoute("/procurement")({
  validateSearch: (search: Record<string, unknown>): { budgetId?: string | undefined } => {
    const budgetId = search["budgetId"];
    return { budgetId: typeof budgetId === "string" ? budgetId : undefined };
  },
  head: () => ({
    meta: [
      { title: "Procurement — TaskFlow" },
      {
        name: "description",
        content: "Plan what's being procured against approved budgets, and track its status.",
      },
    ],
  }),
  component: Procurement,
});

const PROC_STATUS_BADGE: Record<ProcurementItem["status"], string> = {
  planned: "bg-muted text-muted-foreground",
  in_procurement: "bg-warning/12 text-warning",
  delivered: "bg-success/12 text-success",
  cancelled: "bg-destructive/12 text-destructive",
};

const EMPTY_ITEM_FORM = {
  budgetId: "",
  item: "",
  specification: "",
  quantity: "1",
  estimatedCost: "",
  method: "quotation" as ProcurementMethod,
  plannedProcurementDate: "",
  requiredDeliveryDate: "",
  responsibleUnitId: "none",
  fundingSource: "",
};

function Procurement() {
  const { budgetId: focusBudgetId } = Route.useSearch();
  const {
    budgets,
    procurementItems,
    requisitions,
    planNodeById,
    orgUnits,
    orgUnitById,
    budgetCommitted,
    addProcurementItem,
    setProcurementStatus,
  } = useWorkspace();

  const [newItemOpen, setNewItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    ...EMPTY_ITEM_FORM,
    budgetId: focusBudgetId ?? "",
  });

  const approvedBudgets = budgets.filter((b) => b.status === "approved");
  const requisitionCountFor = (procurementItemId: string) =>
    requisitions.filter((r) => r.procurementItemId === procurementItemId).length;

  const openNewItem = () => {
    setItemForm({ ...EMPTY_ITEM_FORM, budgetId: focusBudgetId ?? "" });
    setNewItemOpen(true);
  };

  const submitNewItem = () => {
    const quantity = Number(itemForm.quantity);
    const estimatedCost = Number(itemForm.estimatedCost);
    if (
      !itemForm.budgetId ||
      !itemForm.item.trim() ||
      !itemForm.specification.trim() ||
      !quantity ||
      quantity <= 0 ||
      !estimatedCost ||
      estimatedCost <= 0 ||
      !itemForm.plannedProcurementDate ||
      !itemForm.requiredDeliveryDate ||
      !itemForm.fundingSource.trim()
    ) {
      return;
    }
    addProcurementItem({
      budgetId: itemForm.budgetId,
      item: itemForm.item.trim(),
      specification: itemForm.specification.trim(),
      quantity,
      estimatedCost,
      method: itemForm.method,
      plannedProcurementDate: itemForm.plannedProcurementDate,
      requiredDeliveryDate: itemForm.requiredDeliveryDate,
      responsibleUnitId: itemForm.responsibleUnitId === "none" ? null : itemForm.responsibleUnitId,
      fundingSource: itemForm.fundingSource.trim(),
    });
    setNewItemOpen(false);
  };

  const itemColumns: Array<Column<ProcurementItem>> = [
    {
      key: "item",
      header: "Item",
      render: (p) => (
        <div>
          <p className="text-sm font-medium text-foreground">{p.item}</p>
          <Link
            to="/objectives/$nodeId"
            params={{ nodeId: p.planNodeId }}
            className="text-xs text-muted-foreground hover:underline"
          >
            {planNodeById(p.planNodeId)?.title ?? "—"}
          </Link>
          {p.materialRequestId && (
            <Link
              to="/material-requests"
              className="mt-0.5 block text-xs text-primary hover:underline"
            >
              From a material request
            </Link>
          )}
        </div>
      ),
      exportValue: (p) => p.item,
    },
    {
      key: "quantity",
      header: "Qty",
      render: (p) => p.quantity,
      exportValue: (p) => p.quantity,
    },
    {
      key: "cost",
      header: "Estimated cost",
      render: (p) => `${p.estimatedCost.toLocaleString()} RWF`,
      exportValue: (p) => p.estimatedCost,
    },
    {
      key: "method",
      header: "Method",
      render: (p) => PROCUREMENT_METHOD_LABELS[p.method],
      exportValue: (p) => PROCUREMENT_METHOD_LABELS[p.method],
    },
    {
      key: "unit",
      header: "Responsible unit",
      render: (p) => (p.responsibleUnitId ? (orgUnitById(p.responsibleUnitId)?.name ?? "—") : "—"),
      exportValue: (p) =>
        p.responsibleUnitId ? (orgUnitById(p.responsibleUnitId)?.name ?? "") : "",
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Select
          value={p.status}
          onValueChange={(v) => setProcurementStatus(p.id, v as ProcurementItem["status"])}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue>
              <Badge variant="secondary" className={PROC_STATUS_BADGE[p.status]}>
                {PROCUREMENT_STATUS_LABELS[p.status]}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROCUREMENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      exportValue: (p) => PROCUREMENT_STATUS_LABELS[p.status],
    },
    {
      key: "requisitions",
      header: "",
      render: (p) => {
        const count = requisitionCountFor(p.id);
        if (count === 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <Link to="/requisitions" className="text-sm text-primary hover:underline">
            {count} requisition{count === 1 ? "" : "s"}
          </Link>
        );
      },
      exportValue: (p) => requisitionCountFor(p.id),
    },
  ];

  const unitOptions = orgUnits.map((u) => ({
    value: u.id,
    label: `${ORG_UNIT_LABELS[u.type]}: ${u.name}`,
    keywords: u.name,
  }));

  return (
    <AppShell
      allowedRoles={["admin", ...MANAGER_ROLES]}
      title="Procurement"
      description="What's being procured against approved budgets, and where it stands."
      actions={
        <Button onClick={openNewItem} disabled={approvedBudgets.length === 0}>
          <PackageSearch className="size-4" /> Add Procurement Item
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          title="Total items"
          value={procurementItems.length}
          tone="soft"
        />
        <StatCard
          icon={Package}
          title="Planned"
          value={procurementItems.filter((p) => p.status === "planned").length}
          tone="brand"
        />
        <StatCard
          icon={Truck}
          title="In procurement"
          value={procurementItems.filter((p) => p.status === "in_procurement").length}
          tone="warning"
        />
        <StatCard
          icon={CheckCircle2}
          title="Delivered"
          value={procurementItems.filter((p) => p.status === "delivered").length}
          tone="success"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Procurement plan</h2>
        <DataTable
          rows={procurementItems}
          columns={itemColumns}
          getRowId={(p) => p.id}
          searchFields={(p) => `${p.item} ${p.specification}`}
          exportFileName="procurement-items"
          emptyMessage="No procurement items yet. Add one against an approved budget."
        />
      </div>

      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Procurement Item</DialogTitle>
            <DialogDescription>
              Only budgets that are fully approved can be planned against.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Budget</Label>
              <SearchableSelect
                value={itemForm.budgetId}
                onValueChange={(v) => setItemForm({ ...itemForm, budgetId: v })}
                placeholder="Select an approved budget..."
                searchPlaceholder="Search by objective/activity title..."
                emptyMessage="No approved budgets found."
                options={approvedBudgets.map((b) => ({
                  value: b.id,
                  label: `${planNodeById(b.planNodeId)?.title ?? "—"} — ${b.requestedAmount.toLocaleString()} ${b.currency}`,
                  keywords: planNodeById(b.planNodeId)?.title ?? "",
                }))}
              />
              {itemForm.budgetId && (
                <p className="text-xs text-muted-foreground">
                  {budgetCommitted(itemForm.budgetId).toLocaleString()} committed of{" "}
                  {(
                    budgets.find((b) => b.id === itemForm.budgetId)?.requestedAmount ?? 0
                  ).toLocaleString()}{" "}
                  {budgets.find((b) => b.id === itemForm.budgetId)?.currency}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Item</Label>
              <Input
                value={itemForm.item}
                onChange={(e) => setItemForm({ ...itemForm, item: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Specification</Label>
              <Textarea
                rows={3}
                value={itemForm.specification}
                onChange={(e) => setItemForm({ ...itemForm, specification: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Estimated cost (RWF)</Label>
                <Input
                  type="number"
                  min="1"
                  value={itemForm.estimatedCost}
                  onChange={(e) => setItemForm({ ...itemForm, estimatedCost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Procurement method</Label>
              <Select
                value={itemForm.method}
                onValueChange={(v) => setItemForm({ ...itemForm, method: v as ProcurementMethod })}
              >
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
                <Label>Planned procurement date</Label>
                <Input
                  type="date"
                  value={itemForm.plannedProcurementDate}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, plannedProcurementDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Required delivery date</Label>
                <Input
                  type="date"
                  value={itemForm.requiredDeliveryDate}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, requiredDeliveryDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Responsible unit</Label>
              <SearchableSelect
                value={itemForm.responsibleUnitId}
                onValueChange={(v) => setItemForm({ ...itemForm, responsibleUnitId: v })}
                placeholder="Select a unit..."
                searchPlaceholder="Search campus, college, school, department..."
                emptyMessage="No units found."
                options={[{ value: "none", label: "None" }, ...unitOptions]}
              />
              <p className="text-xs text-muted-foreground">
                The unit's manager will approve requisitions raised against this item.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Funding source</Label>
              <Input
                value={itemForm.fundingSource}
                onChange={(e) => setItemForm({ ...itemForm, fundingSource: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewItemOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNewItem}>Add to plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
