import { useState } from "react";
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, ListChecks, Plus, Target, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { PlanNodeTable } from "@/components/plan-node-table";
import {
  EMPTY_PLAN_NODE_FORM,
  PlanNodeFormFields,
  type PlanNodeFormState,
} from "@/components/plan-node-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/lib/workspace-store";
import type { PlanNode } from "@/lib/mock-data";

/** Depth-first order (roots first, each node's children right after it) so the flattened table still reads as a hierarchy. */
function flattenOrdered(nodes: PlanNode[]): PlanNode[] {
  const byParent = new Map<string | null, PlanNode[]>();
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }
  const result: PlanNode[] = [];
  const visit = (parentId: string | null) => {
    for (const n of byParent.get(parentId) ?? []) {
      result.push(n);
      visit(n.id);
    }
  };
  visit(null);
  return result;
}

export const Route = createFileRoute("/objectives")({
  head: () => ({
    meta: [
      { title: "Objectives & Activities — TaskFlow" },
      {
        name: "description",
        content: "Strategic objectives, outputs and activities for your institution.",
      },
    ],
  }),
  component: Objectives,
});

function Objectives() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { planNodes, addPlanNode } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanNodeFormState>(EMPTY_PLAN_NODE_FORM);

  if (pathname !== "/objectives") {
    return <Outlet />;
  }

  const strategicObjectives = planNodes.filter((n) => n.type === "strategic_objective");
  const outputs = planNodes.filter((n) => n.type === "output");
  const activities = planNodes.filter((n) => n.type === "activity");
  const delayedActivities = activities.filter((n) => n.status === "delayed");
  const allNodesOrdered = flattenOrdered(planNodes);

  const submit = () => {
    if (!form.title.trim()) return;
    addPlanNode({
      type: "strategic_objective",
      parentId: null,
      title: form.title.trim(),
      description: form.description.trim(),
      responsibleUnitId: form.responsibleUnitId === "none" ? null : form.responsibleUnitId,
      ownerId: form.ownerId === "none" ? null : form.ownerId,
      indicator: form.indicator,
      baseline: form.baseline,
      target: form.target,
      strategicPillar: form.strategicPillar,
      planningPeriod: form.planningPeriod,
      sourceOfVerification: form.sourceOfVerification,
    });
    setForm(EMPTY_PLAN_NODE_FORM);
    setOpen(false);
  };

  return (
    <AppShell
      allowedRoles={["admin", "principal"]}
      title="Objectives & Activities"
      description="Every objective, output and activity for your institution, in one place — with who's responsible for each."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add Strategic Objective
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Target}
          title="Strategic Objectives"
          value={strategicObjectives.length}
          tone="brand"
        />
        <StatCard icon={ListChecks} title="Outputs" value={outputs.length} tone="soft" />
        <StatCard icon={Zap} title="Activities" value={activities.length} tone="success" />
        <StatCard
          icon={AlertTriangle}
          title="Activities Delayed"
          value={delayedActivities.length}
          tone={delayedActivities.length > 0 ? "warning" : "success"}
        />
      </div>

      <PlanNodeTable
        nodes={allNodesOrdered}
        emptyMessage="No objectives yet."
        exportFileName="objectives"
        showParent
      />

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setForm(EMPTY_PLAN_NODE_FORM);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Strategic Objective</DialogTitle>
            <DialogDescription>
              The top of your institution's planning chain — everything else attaches beneath it.
            </DialogDescription>
          </DialogHeader>
          <PlanNodeFormFields type="strategic_objective" value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
