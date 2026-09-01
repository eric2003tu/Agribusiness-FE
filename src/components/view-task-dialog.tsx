import { Eye } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import type { Task } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-store";

interface ViewTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewTaskDialog({ task, open, onOpenChange }: ViewTaskDialogProps) {
  const { memberById } = useWorkspace();
  const assignee = memberById(task.assigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>{task.id} · {task.project}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="mt-1 text-sm text-foreground">
              {task.description || "No description provided."}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={task.status} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Priority</p>
              <div className="mt-1">
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assignee</p>
              <div className="mt-1 flex items-center gap-2">
                <UserAvatar member={assignee} className="size-6" />
                <span className="text-sm">{assignee?.name ?? "Unassigned"}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Due date</p>
              <p className="mt-1 text-sm text-foreground">{task.dueDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hours logged</p>
              <p className="mt-1 text-sm text-foreground">
                {task.loggedHours}h / {task.estimateHours}h
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="mt-1 text-sm text-foreground">{task.createdAt}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
