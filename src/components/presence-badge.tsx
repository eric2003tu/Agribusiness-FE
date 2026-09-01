import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import type { PresenceStatus } from "@/lib/mock-data";

const PRESENCE_CONFIG: Record<PresenceStatus, { label: string; dot: string; className: string }> = {
  active: { label: "Active", dot: "bg-success", className: "border-success/40 text-success" },
  idle: { label: "Idle", dot: "bg-warning", className: "border-warning/40 text-warning" },
  away: {
    label: "Away",
    dot: "bg-muted-foreground",
    className: "border-border text-muted-foreground",
  },
};

interface PresenceBadgeProps {
  presence: PresenceStatus;
  lastActiveAt: string;
  className?: string;
}

export function PresenceBadge({ presence, lastActiveAt, className }: PresenceBadgeProps) {
  const now = useNow();
  const config = PRESENCE_CONFIG[presence];
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${config.className} ${className ?? ""}`}
      title={`Last active ${timeAgo(lastActiveAt, now)}`}
    >
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}
