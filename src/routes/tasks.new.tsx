import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
  TAGS,
  TASK_TYPE_LABELS,
  type Priority,
  type TaskType,
} from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/tasks/new")({
  validateSearch: (search: Record<string, unknown>): { activityId?: string | undefined } => {
    const activityId = search["activityId"];
    return { activityId: typeof activityId === "string" ? activityId : undefined };
  },
  head: () => ({
    meta: [
      { title: "New task — TaskFlow" },
      { name: "description", content: "Create a new task in TaskFlow." },
    ],
  }),
  component: NewTaskPage,
});

function NewTaskPage() {
  const { members, planNodes, addTask, currentUser, orgUnitPath } = useWorkspace();
  const navigate = useNavigate();
  const { activityId: lockedActivityId } = Route.useSearch();
  const activities = planNodes.filter((n) => n.type === "activity");
  const lockedActivity = lockedActivityId
    ? activities.find((a) => a.id === lockedActivityId)
    : undefined;
  const [activityId, setActivityId] = useState<string>(lockedActivityId ?? "none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>(currentUser.id);
  const [project, setProject] = useState<string>(PROJECTS[0] as string);
  const [priority, setPriority] = useState<Priority>("medium");
  const [type, setType] = useState<TaskType>("feature");
  const [milestone, setMilestone] = useState<string>(MILESTONES[0] as string);
  const [tags, setTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimateHours, setEstimateHours] = useState("4");

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const submit = () => {
    if (!title.trim()) {
      toast.error("Title is required", { description: "Give the task a clear name." });
      return;
    }
    if (!dueDate) {
      toast.error("Due date is required", { description: "Pick when the work must be done." });
      return;
    }
    addTask({
      title: title.trim(),
      description: description.trim(),
      assigneeId: assigneeId === "unassigned" ? null : assigneeId,
      status: "not_started",
      priority,
      type,
      project,
      tags,
      milestone,
      dueDate,
      startDate,
      completedAt: null,
      estimateHours: Number(estimateHours) || 1,
      subtasks: 0,
      comments: 0,
      attachments: 0,
      activityId: activityId === "none" ? null : activityId,
    });
    navigate({ to: "/tasks" });
  };

  return (
    <AppShell title="Create a task" description="Assign work to yourself or a team member.">
      <div className="mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate({ to: "/tasks" })}
        >
          <ArrowLeft className="size-4" /> Back to tasks
        </Button>

        <div className="surface-card p-6 space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Prepare weekly stock report"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs to be done?"
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
                {lockedActivity ? (
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                    Linked to activity: {lockedActivity.title}
                  </div>
                ) : (
                  <SearchableSelect
                    value={activityId}
                    onValueChange={setActivityId}
                    placeholder="Select an activity..."
                    searchPlaceholder="Search activities..."
                    emptyMessage="No activities found."
                    options={[
                      { value: "none", label: "None" },
                      ...activities.map((a) => ({
                        value: a.id,
                        label: a.title,
                        keywords: a.title,
                      })),
                    ]}
                  />
                )}
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
                <Label htmlFor="task-est">Estimate (hours)</Label>
                <Input
                  id="task-est"
                  type="number"
                  min="1"
                  value={estimateHours}
                  onChange={(e) => setEstimateHours(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-start">Start date</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-due">Due date</Label>
                <Input
                  id="task-due"
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

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate({ to: "/tasks" })}>
              Cancel
            </Button>
            <Button onClick={submit}>
              <Plus className="size-4" /> Create task
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
