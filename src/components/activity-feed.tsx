import { CheckCircle2, Clock, MessageSquare, AlertCircle, UserMinus, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useWorkspace } from "@/lib/workspace-store";
import { timeAgo } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import type { ActivityAction, ActivityLog } from "@/lib/mock-data";

const ACTION_CONFIG: Record<ActivityAction, { icon: typeof Clock; color: string; label: string }> =
  {
    created: { icon: Plus, color: "text-info", label: "created" },
    updated: { icon: Clock, color: "text-muted-foreground", label: "updated" },
    completed: { icon: CheckCircle2, color: "text-success", label: "completed" },
    reassigned: { icon: UserMinus, color: "text-warning", label: "reassigned" },
    deleted: { icon: AlertCircle, color: "text-destructive", label: "deleted" },
    status_change: { icon: MessageSquare, color: "text-primary", label: "changed status" },
  };

interface ActivityFeedProps {
  memberId?: string | undefined;
  limit?: number;
  filter?: ((log: ActivityLog) => boolean) | undefined;
}

export function ActivityFeed({ memberId, limit = 20, filter }: ActivityFeedProps) {
  const { activity, memberById } = useWorkspace();
  const now = useNow();
  const filtered = activity
    .filter((a) => (memberId ? a.userId === memberId : true))
    .filter((a) => (filter ? filter(a) : true));
  const items = filtered.slice(0, limit);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const config = ACTION_CONFIG[item.action];
        const Icon = config.icon;
        const user = memberById(item.userId);
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
          >
            <div className={`mt-0.5 ${config.color}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{user?.name ?? "Unknown"}</span> {config.label}{" "}
                <Link
                  to={`/task/$taskId`}
                  params={{ taskId: item.taskId }}
                  className="font-medium text-primary hover:underline"
                >
                  {item.taskTitle}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(item.timestamp, now)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
