import { cva } from "class-variance-authority";
import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type TaskStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
);

export const STATUS_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-info/12 text-info",
  blocked: "bg-destructive/12 text-destructive",
  completed: "bg-success/12 text-success",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary-soft text-primary",
  high: "bg-warning/20 text-warning-foreground",
  urgent: "bg-destructive/12 text-destructive",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn(badge(), STATUS_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn(badge(), PRIORITY_STYLES[priority])}>{PRIORITY_LABELS[priority]}</span>
  );
}
