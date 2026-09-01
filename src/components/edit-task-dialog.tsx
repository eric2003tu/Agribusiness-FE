import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/searchable-select";
import {
  MILESTONES,
  PRIORITY_LABELS,
  PROJECTS,
  STATUS_LABELS,
  TAGS,
  TASK_TYPE_LABELS,
  type Priority,
  type Task,
  type TaskStatus,
  type TaskType,
} from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-store";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  const { members, planNodes, updateTask, orgUnitPath } = useWorkspace();
  const activities = planNodes.filter((n) => n.type === "activity");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "unassigned");
  const [activityId, setActivityId] = useState(task.activityId ?? "none");
  const [project, setProject] = useState(task.project);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [type, setType] = useState<TaskType>(task.type);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [milestone, setMilestone] = useState(task.milestone);
  const [tags, setTags] = useState<string[]>(task.tags);
  const [startDate, setStartDate] = useState(task.startDate);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [estimateHours, setEstimateHours] = useState(String(task.estimateHours));

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const submit = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!dueDate) {
      toast.error("Due date is required");
      return;
    }
    const completedAt =
      status === "completed" && task.status !== "completed"
        ? new Date().toISOString().slice(0, 10)
        : status !== "completed"
          ? null
          : task.completedAt;
    updateTask(task.id, {
      title: title.trim(),
      description: description.trim(),
      assigneeId: assigneeId === "unassigned" ? null : assigneeId,
      project,
      priority,
      type,
      status,
      milestone,
      tags,
      startDate,
      dueDate,
      completedAt,
      estimateHours: Number(estimateHours) || 1,
      activityId: activityId === "none" ? null : activityId,
    });
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTitle(task.title);
      setDescription(task.description);
      setAssigneeId(task.assigneeId ?? "unassigned");
      setActivityId(task.activityId ?? "none");
      setProject(task.project);
      setPriority(task.priority);
      setType(task.type);
      setStatus(task.status);
      setMilestone(task.milestone);
      setTags(task.tags);
      setStartDate(task.startDate);
      setDueDate(task.dueDate);
      setEstimateHours(String(task.estimateHours));
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            {task.id} · {task.project}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <SearchableSelect
                value={assigneeId}
                onValueChange={setAssigneeId}
                placeholder="Select assignee..."
                searchPlaceholder="Search by name, role, or department..."
                emptyMessage="No team members found."
                options={[
                  ...members.map((m) => ({
                    value: m.id,
                    label: m.name,
                    keywords: `${m.name} ${m.title} ${m.role} ${orgUnitPath(m.orgUnitId)
                      .map((u) => u.name)
                      .join(" ")}`,
                  })),
                  { value: "unassigned", label: "Unassigned", keywords: "unassigned" },
                ]}
              />
            </div>
            <div className="grid gap-2">
              <Label>Activity</Label>
              <Select value={activityId} onValueChange={setActivityId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Milestone</Label>
              <Select value={milestone} onValueChange={setMilestone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-est">Estimate (hours)</Label>
              <Input
                id="edit-est"
                type="number"
                min="1"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-start">Start date</Label>
              <Input
                id="edit-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due">Due date</Label>
              <Input
                id="edit-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {tags.includes(tag) && <X className="size-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Pencil className="size-4" /> Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
