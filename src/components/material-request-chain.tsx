import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/workspace-store";
import { APPROVAL_STEP_LABELS, type MaterialRequest } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const DECISION_BADGE: Record<string, string> = {
  approved: "bg-success/12 text-success",
  rejected: "bg-destructive/12 text-destructive",
  queried: "bg-warning/12 text-warning",
  pending: "bg-muted text-muted-foreground",
};

const DECISION_LABEL: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  queried: "Queried",
  pending: "Pending",
};

export function MaterialRequestChainProgress({ request }: { request: MaterialRequest }) {
  const { memberById } = useWorkspace();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {request.steps.map((step, i) => {
        const approver = memberById(step.approverId);
        const isCurrent = i === request.currentStepIndex && request.status === "pending";
        return (
          <div key={`${step.role}-${i}`} className="flex items-center gap-2">
            <div
              className={cn(
                "min-w-[9rem] rounded-lg border p-2.5",
                isCurrent && "border-primary ring-1 ring-primary",
              )}
            >
              <p className="text-xs font-medium text-foreground">
                {APPROVAL_STEP_LABELS[step.role]}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {approver?.name ?? "Unassigned"}
              </p>
              <Badge variant="secondary" className={cn("mt-1", DECISION_BADGE[step.decision])}>
                {DECISION_LABEL[step.decision]}
              </Badge>
            </div>
            {i < request.steps.length - 1 && (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}
