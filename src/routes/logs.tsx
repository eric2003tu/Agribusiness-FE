import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Handshake, ScrollText, ShoppingCart, Users, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { KIND_CONFIG } from "@/components/notification-feed";
import { useWorkspace } from "@/lib/workspace-store";
import type { AuditLogEntry, AuditStatus, NotificationKind, NotificationLog } from "@/lib/mock-data";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Audit log — Agribridge" },
      {
        name: "description",
        content: "Every action taken on the platform — who did it, what it touched, and whether it succeeded.",
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

const STATUS_LABELS: Record<AuditStatus, string> = { success: "Succeeded", failed: "Failed" };

function AuditStatusBadge({ status }: { status: AuditStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        status === "success" ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
      }`}
    >
      {status === "success" ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function Logs() {
  const { users, notifications, auditLog, userById } = useWorkspace();

  const succeeded = auditLog.filter((a) => a.status === "success").length;
  const failed = auditLog.filter((a) => a.status === "failed").length;
  const uniqueActors = new Set(auditLog.map((a) => a.actorId ?? a.actorLabel ?? "unknown")).size;

  const activityColumns: Column<AuditLogEntry>[] = [
    {
      key: "actor",
      header: "Actor",
      render: (a) => {
        const actor = userById(a.actorId ?? undefined);
        return (
          <div className="flex items-center gap-2">
            <UserAvatar user={actor} className="size-7 text-[10px]" />
            <span className="min-w-0 truncate font-medium text-foreground">
              {actor?.name ?? a.actorLabel ?? "Unknown"}
            </span>
          </div>
        );
      },
      exportValue: (a) => userById(a.actorId ?? undefined)?.name ?? a.actorLabel ?? "Unknown",
    },
    {
      key: "action",
      header: "Action",
      render: (a) => a.action,
      exportValue: (a) => a.action,
    },
    {
      key: "target",
      header: "Target",
      render: (a) => <span className="text-muted-foreground">{a.targetLabel}</span>,
      exportValue: (a) => a.targetLabel,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <div>
          <AuditStatusBadge status={a.status} />
          {a.status === "failed" && a.reason && (
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{a.reason}</p>
          )}
        </div>
      ),
      exportValue: (a) => STATUS_LABELS[a.status],
    },
    {
      key: "timestamp",
      header: "When",
      render: (a) => <span className="whitespace-nowrap">{formatSentAt(a.timestamp)}</span>,
      exportValue: (a) => a.timestamp,
    },
  ];

  const activityFilters: FilterConfig<AuditLogEntry>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "success", label: "Succeeded" },
        { value: "failed", label: "Failed" },
      ],
      match: (a, v) => a.status === v,
    },
    {
      key: "actor",
      label: "Actor",
      options: users.map((u) => ({ value: u.id, label: u.name })),
      match: (a, v) => a.actorId === v,
    },
  ];

  const notificationColumns: Column<NotificationLog>[] = [
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

  const notificationFilters: FilterConfig<NotificationLog>[] = [
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
      description="Every action taken on the platform, and every notification sent."
    >
      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity ({auditLog.length})</TabsTrigger>
          <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ScrollText} title="Total actions" value={auditLog.length} tone="brand" />
            <StatCard icon={CheckCircle2} title="Succeeded" value={succeeded} tone="success" />
            <StatCard icon={AlertTriangle} title="Failed" value={failed} tone={failed > 0 ? "warning" : "success"} />
            <StatCard icon={Users} title="Unique actors" value={uniqueActors} tone="soft" />
          </div>

          <DataTable
            rows={auditLog}
            columns={activityColumns}
            getRowId={(a) => a.id}
            searchFields={(a) =>
              `${a.action} ${a.targetLabel} ${userById(a.actorId ?? undefined)?.name ?? a.actorLabel ?? ""}`
            }
            filters={activityFilters}
            exportFileName="audit-activity"
            paginate
            pageSizeOptions={[10, 25, 50, 100]}
            searchPlaceholder="Search by actor, action or target…"
            emptyMessage="No activity recorded yet."
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
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
            columns={notificationColumns}
            getRowId={(n) => n.id}
            searchFields={(n) => `${n.title} ${n.detail} ${userById(n.userId)?.name ?? ""}`}
            filters={notificationFilters}
            exportFileName="notifications"
            paginate
            pageSizeOptions={[10, 25, 50, 100]}
            searchPlaceholder="Search by title, detail or recipient…"
            emptyMessage="No notifications match your filters."
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
