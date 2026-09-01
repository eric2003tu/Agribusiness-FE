import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Eye, Pencil, PlayCircle, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  PRIORITY_LABELS,
  PROJECTS,
  STATUS_LABELS,
  type Priority,
  type Task,
  type TaskStatus,
} from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-store";

interface TaskTableProps {
  rows: Task[];
  showBulkActions?: boolean;
  initialFilters?: Record<string, string> | undefined;
}

export function TaskTable({ rows, showBulkActions = true, initialFilters }: TaskTableProps) {
  const { memberById, members, updateTaskStatus, reassignTasks, deleteTasks, getTaskFlags, can } =
    useWorkspace();
  const navigate = useNavigate();

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const columns: Array<Column<Task>> = [
    {
      key: "title",
      header: "Task",
      className: "min-w-[260px]",
      render: (t) => (
        <div>
          <p className="font-medium text-foreground">{t.title}</p>
          <p className="text-xs text-muted-foreground">
            {t.id} · {t.project}
          </p>
        </div>
      ),
      exportValue: (t) => t.title,
    },
    {
      key: "assignee",
      header: "Assignee",
      render: (t) => {
        const m = memberById(t.assigneeId);
        return (
          <div className="flex items-center gap-2">
            <UserAvatar member={m} className="size-7" />
            <span className="text-sm">{m ? m.name : "Unassigned"}</span>
          </div>
        );
      },
      exportValue: (t) => memberById(t.assigneeId)?.name ?? "Unassigned",
    },
    {
      key: "status",
      header: "Status",
      render: (t) => <StatusBadge status={t.status} />,
      exportValue: (t) => STATUS_LABELS[t.status],
    },
    {
      key: "priority",
      header: "Priority",
      render: (t) => <PriorityBadge priority={t.priority} />,
      exportValue: (t) => PRIORITY_LABELS[t.priority],
    },
    {
      key: "due",
      header: "Due",
      render: (t) => <span className="text-sm text-muted-foreground">{t.dueDate}</span>,
      exportValue: (t) => t.dueDate,
    },
    {
      key: "hours",
      header: "Hours",
      render: (t) => (
        <span className="text-sm text-muted-foreground">
          {t.loggedHours}/{t.estimateHours}h
        </span>
      ),
      exportValue: (t) => `${t.loggedHours}/${t.estimateHours}`,
    },
    ...(can("manageTasks")
      ? [
          {
            key: "actions",
            header: "",
            className: "w-12",
            render: (t: Task) => (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => navigate({ to: `/task/${t.id}` })}
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setEditTask(t)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTask(t)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ),
            exportValue: () => "",
          } as Column<Task>,
        ]
      : [
          {
            key: "complete",
            header: "",
            className: "w-24",
            render: (t: Task) => (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => navigate({ to: `/task/${t.id}` })}
                >
                  <Eye className="size-4" />
                </Button>
                {t.status !== "completed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => updateTaskStatus([t.id], "completed")}
                  >
                    <CheckCircle2 className="size-3.5" /> Done
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Completed</span>
                )}
              </div>
            ),
            exportValue: () => "",
          } as Column<Task>,
        ]),
  ];

  const filters: Array<FilterConfig<Task>> = [
    {
      key: "status",
      label: "Status",
      options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
      match: (t, v) => t.status === (v as TaskStatus),
    },
    {
      key: "priority",
      label: "Priority",
      options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
      match: (t, v) => t.priority === (v as Priority),
    },
    {
      key: "project",
      label: "Project",
      options: PROJECTS.map((p) => ({ value: p, label: p })),
      match: (t, v) => t.project === v,
    },
    {
      key: "overdue",
      label: "Overdue",
      options: [{ value: "yes", label: "Overdue only" }],
      match: (t) => getTaskFlags(t.id).overdue,
    },
    {
      key: "stalled",
      label: "Stalled",
      options: [{ value: "yes", label: "Stalled only" }],
      match: (t) => getTaskFlags(t.id).stalled,
    },
    {
      key: "overBudget",
      label: "Over budget",
      options: [{ value: "yes", label: "Over budget only" }],
      match: (t) => getTaskFlags(t.id).overBudget,
    },
  ];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(t) => t.id}
        searchFields={(t) =>
          `${t.id} ${t.title} ${t.description} ${t.project} ${memberById(t.assigneeId)?.name ?? ""}`
        }
        filters={filters}
        initialFilters={initialFilters}
        exportFileName="tasks"
        emptyMessage="No tasks match your search or filters."
        toolbarActions={
          showBulkActions
            ? (ids, clear) => (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      updateTaskStatus(ids, "in_progress");
                      clear();
                    }}
                  >
                    <PlayCircle className="size-4" /> Start
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      updateTaskStatus(ids, "completed");
                      clear();
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Complete
                  </Button>
                  {can("manageTasks") && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <UserCog className="size-4" /> Reassign
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                          {members.map((m) => (
                            <DropdownMenuItem
                              key={m.id}
                              onClick={() => {
                                reassignTasks(ids, m.id);
                                clear();
                              }}
                            >
                              {m.name}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem
                            onClick={() => {
                              reassignTasks(ids, null);
                              clear();
                            }}
                          >
                            Unassign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deleteTasks(ids);
                          clear();
                        }}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </>
                  )}
                </>
              )
            : undefined
        }
      />

      {editTask && (
        <EditTaskDialog
          task={editTask}
          open={!!editTask}
          onOpenChange={(o) => { if (!o) setEditTask(null); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTask}
        onOpenChange={(o) => { if (!o) setDeleteTask(null); }}
        title="Delete task"
        description={`Are you sure you want to delete "${deleteTask?.title}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteTask) deleteTasks([deleteTask.id]);
          setDeleteTask(null);
        }}
      />
    </>
  );
}
