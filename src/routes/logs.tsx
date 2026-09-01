import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { NotificationFeed } from "@/components/notification-feed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import type { NotificationKind } from "@/lib/mock-data";

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

const KIND_OPTIONS: Array<{ value: NotificationKind | "all"; label: string }> = [
  { value: "all", label: "All kinds" },
  { value: "new_match", label: "New match" },
  { value: "aggregation_invite", label: "Aggregation invite" },
  { value: "spoilage_alert", label: "Spoilage alert" },
  { value: "group_purchase", label: "Group purchase" },
  { value: "transaction", label: "Transaction" },
  { value: "system", label: "System" },
];

function Logs() {
  const { users, notifications } = useWorkspace();
  const [userFilter, setUserFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<NotificationKind | "all">("all");

  const filtered = notifications.filter(
    (n) =>
      (userFilter === "all" || n.userId === userFilter) &&
      (kindFilter === "all" || n.kind === kindFilter),
  );

  return (
    <AppShell
      allowedRoles={["admin"]}
      title="Audit log"
      description="Every notification sent across the platform, in order."
    >
      <div className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap gap-3">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as NotificationKind | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <NotificationFeed items={filtered} limit={200} />
      </div>
    </AppShell>
  );
}
