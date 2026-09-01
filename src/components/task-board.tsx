import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, Paperclip } from "lucide-react";
import { PriorityBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type Member, type Task, type TaskStatus } from "@/lib/mock-data";
import { useWorkspace, type TaskFlags } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

const COLUMN_ORDER = Object.keys(STATUS_LABELS) as TaskStatus[];

const COLUMN_DOT: Record<TaskStatus, string> = {
  not_started: "bg-muted-foreground",
  in_progress: "bg-info",
  blocked: "bg-destructive",
  completed: "bg-success",
};

interface TaskBoardProps {
  rows: Task[];
}

export function TaskBoard({ rows }: TaskBoardProps) {
  const { memberById, updateTaskStatus, getTaskFlags } = useWorkspace();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(COLUMN_ORDER.map((s) => [s, [] as Task[]]));
    rows.forEach((t) => map.get(t.status)?.push(t));
    return map;
  }, [rows]);

  const activeTask = activeId ? rows.find((t) => t.id === activeId) : undefined;

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = rows.find((t) => t.id === active.id);
    if (task && task.status !== newStatus) {
      updateTaskStatus([task.id], newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMN_ORDER.map((status) => (
          <BoardColumn key={status} status={status} tasks={columns.get(status) ?? []}>
            {(columns.get(status) ?? []).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={memberById(task.assigneeId)}
                flags={getTaskFlags(task.id)}
              />
            ))}
          </BoardColumn>
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            assignee={memberById(activeTask.assigneeId)}
            flags={getTaskFlags(activeTask.id)}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  tasks,
  children,
}: {
  status: TaskStatus;
  tasks: Task[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col rounded-xl border border-border bg-muted/30">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className={cn("size-2 rounded-full", COLUMN_DOT[status])} />
        <h3 className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
        <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-40 flex-1 flex-col gap-2 p-2 transition-colors",
          isOver && "bg-primary-soft/60",
        )}
      >
        {tasks.length === 0 && !isOver && (
          <p className="p-4 text-center text-xs text-muted-foreground">No tasks</p>
        )}
        {children}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  assignee,
  flags,
  overlay = false,
}: {
  task: Task;
  assignee: Member | undefined;
  flags: TaskFlags;
  overlay?: boolean;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => !overlay && navigate({ to: "/task/$taskId", params: { taskId: task.id } })}
      className={cn(
        "surface-card cursor-grab space-y-2 p-3 text-left active:cursor-grabbing",
        isDragging && !overlay && "opacity-30",
        overlay && "shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>

      {(flags.overdue || flags.stalled) && (
        <div className="flex flex-wrap gap-1">
          {flags.overdue && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlertTriangle className="size-2.5" /> Overdue
            </Badge>
          )}
          {flags.stalled && (
            <Badge variant="outline" className="gap-1 border-warning text-[10px] text-warning">
              <Clock className="size-2.5" /> Stalled
            </Badge>
          )}
        </div>
      )}

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.subtasks > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3" /> {task.subtasks}
            </span>
          )}
          {task.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" /> {task.comments}
            </span>
          )}
          {task.attachments > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="size-3" /> {task.attachments}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn("text-xs", flags.overdue ? "text-destructive" : "text-muted-foreground")}
          >
            {task.dueDate}
          </span>
          <UserAvatar member={assignee} className="size-6" />
        </div>
      </div>
    </div>
  );
}
