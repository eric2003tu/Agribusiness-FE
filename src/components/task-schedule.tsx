import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-store";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface TaskScheduleProps {
  rows: Task[];
}

export function TaskSchedule({ rows }: TaskScheduleProps) {
  const { memberById, getTaskFlags } = useWorkspace();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayKey = useMemo(() => {
    const t = new Date();
    return toDateKey(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    rows.forEach((t) => {
      if (!t.dueDate) return;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    });
    return map;
  }, [rows]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const day = i - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      return { day, key: toDateKey(year, month, day) };
    });
  }, [year, month]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const shiftMonth = (delta: number) =>
    setCursor((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });

  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCursor(() => {
                const d = new Date();
                d.setDate(1);
                return d;
              })
            }
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => shiftMonth(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-muted/60 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="min-h-24 bg-background/50" />;
          const dayTasks = tasksByDate.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;
          return (
            <div key={cell.key} className="flex min-h-24 flex-col gap-1 bg-background p-1.5">
              <span
                className={cn(
                  "self-start rounded-full px-1.5 text-xs",
                  isToday
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {cell.day}
              </span>
              <div className="flex flex-col gap-1">
                {dayTasks.slice(0, 3).map((t) => {
                  const overdue = getTaskFlags(t.id).overdue;
                  return (
                    <button
                      key={t.id}
                      onClick={() => navigate({ to: "/task/$taskId", params: { taskId: t.id } })}
                      className={cn(
                        "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px]",
                        overdue
                          ? "bg-destructive/12 text-destructive"
                          : "bg-primary-soft text-primary",
                      )}
                    >
                      <UserAvatar member={memberById(t.assigneeId)} className="size-3.5 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <span className="px-1.5 text-[11px] text-muted-foreground">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
