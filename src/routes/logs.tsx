import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Handshake, ScrollText, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { KIND_CONFIG } from "@/components/notification-feed";
import { useWorkspace } from "@/lib/workspace-store";
import type { NotificationKind, NotificationLog } from "@/lib/mock-data";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Audit log — Agribridge" },
      {
        name: "description",
        content: "Every SMS-style notification sent across the platform, filterable by user and type.",
      },
    ],
  }),
  component: Logs,
});

function formatSentAt(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const KIND_LABELS: Record<NotificationKind, string> = {
  new_match: "New match",
  aggregation_invite: "Aggregation invite",
  spoilage_alert: "Spoilage alert",
  group_purchase: "Group purchase",
  transaction: "Transaction",
  system: "System",
};

function Logs() {
  const { users, notifications, userById } = useWorkspace();

  const columns: Column<NotificationLog>[] = [
    {
      key: "kind",
      header: "Kind",
      render: (n) => {
        const config = KIND_CONFIG[n.kind];
        const Icon = config.icon;
        return (
          <span className={`flex items-center gap-1.5 text-sm ${config.color}`}>
            <Icon className="size-4" />
            {KIND_LABELS[n.kind]}
          </span>
        );
      },
      exportValue: (n) => KIND_LABELS[n.kind],
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (n) => userById(n.userId)?.name ?? "—",
      exportValue: (n) => userById(n.userId)?.name ?? "",
    },
    {
      key: "title",
      header: "Title",
      render: (n) => <span className="font-medium text-foreground">{n.title}</span>,
      exportValue: (n) => n.title,
    },
    {
      key: "detail",
      header: "Detail",
      render: (n) => <span className="line-clamp-2 max-w-sm text-muted-foreground">{n.detail}</span>,
      exportValue: (n) => n.detail,
    },
    {
      key: "timestamp",
      header: "Sent",
      render: (n) => <span className="whitespace-nowrap">{formatSentAt(n.timestamp)}</span>,
      exportValue: (n) => n.timestamp,
    },
  ];

  const filters: FilterConfig<NotificationLog>[] = [
    {
      key: "kind",
      label: "Kind",
      options: Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })),
      match: (n, v) => n.kind === v,
    },
    {
      key: "recipient",
      label: "Recipient",
      options: users.map((u) => ({ value: u.id, label: u.name })),
      match: (n, v) => n.userId === v,
    },
  ];

  return (
    <AppShell
      allowedRoles={["admin"]}
      title="Audit log"
      description="Every notification sent across the platform, in order."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ScrollText} title="Total notifications" value={notifications.length} tone="brand" />
        <StatCard
          icon={ShoppingCart}
          title="Transaction alerts"
          value={notifications.filter((n) => n.kind === "transaction").length}
          tone="success"
        />
        <StatCard
          icon={Handshake}
          title="Aggregation invites"
          value={notifications.filter((n) => n.kind === "aggregation_invite").length}
          tone="soft"
        />
        <StatCard
          icon={AlertTriangle}
          title="Spoilage alerts"
          value={notifications.filter((n) => n.kind === "spoilage_alert").length}
          tone={notifications.some((n) => n.kind === "spoilage_alert") ? "warning" : "success"}
        />
      </div>

      <DataTable
        rows={notifications}
        columns={columns}
        getRowId={(n) => n.id}
        searchFields={(n) => `${n.title} ${n.detail} ${userById(n.userId)?.name ?? ""}`}
        filters={filters}
        exportFileName="audit-log"
        paginate
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder="Search by title, detail or recipient…"
        emptyMessage="No notifications match your filters."
      />
    </AppShell>
  );
}
