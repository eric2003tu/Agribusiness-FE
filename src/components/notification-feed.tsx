import { AlertTriangle, Bell, Handshake, ShoppingCart, Boxes, Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import type { NotificationKind } from "@/lib/mock-data";

const KIND_CONFIG: Record<NotificationKind, { icon: typeof Bell; color: string }> = {
  new_match: { icon: Sparkles, color: "text-info" },
  aggregation_invite: { icon: Handshake, color: "text-primary" },
  spoilage_alert: { icon: AlertTriangle, color: "text-warning" },
  group_purchase: { icon: Boxes, color: "text-primary" },
  transaction: { icon: ShoppingCart, color: "text-success" },
  system: { icon: Bell, color: "text-muted-foreground" },
};

interface NotificationFeedProps {
  items: Array<{ id: string; timestamp: string; title: string; detail: string; kind: NotificationKind }>;
  limit?: number;
}

export function NotificationFeed({ items, limit = 20 }: NotificationFeedProps) {
  const now = useNow();
  const rows = items.slice(0, limit);

  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>;
  }

  return (
    <div className="space-y-1">
      {rows.map((item) => {
        const config = KIND_CONFIG[item.kind];
        const Icon = config.icon;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <div className={`mt-0.5 ${config.color}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
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
