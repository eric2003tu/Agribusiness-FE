import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Ban, Building2, CheckCircle2, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StaffAccessNotice } from "@/components/staff-access-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { ApiError } from "@/lib/api/client";
import {
  listOrganizationMembersApi,
  listOrganizationsApi,
  listOrganizationTypesApi,
} from "@/lib/api/organizations";
import type { ApiOrganizationFull, OrganizationStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cooperatives")({
  head: () => ({
    meta: [
      { title: "Cooperatives — Agribridge" },
      {
        name: "description",
        content: "Organizations on the live AgriBridge API — cooperatives, distributors and more.",
      },
    ],
  }),
  component: CooperativesPage,
});

const ORG_STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  deleted: "Deleted",
};

const ORG_STATUS_STYLES: Record<OrganizationStatus, string> = {
  active: "bg-success/12 text-success",
  suspended: "bg-destructive/12 text-destructive",
  deleted: "bg-muted text-muted-foreground",
};

function OrgStatusBadge({ status }: { status: OrganizationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        ORG_STATUS_STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ORG_STATUS_LABELS[status]}
    </span>
  );
}

function CooperativesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { items, loading, error } = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const typesList = useApiList(() => listOrganizationTypesApi({ page_size: 100 }), []);
  const membersList = useApiList(() => listOrganizationMembersApi({ page_size: 200 }), []);

  const types = typesList.items;
  const typeName = (id: number) => types.find((t) => t.id === id)?.name ?? `#${id}`;
  const totalMembers = membersList.items.length;
  const memberCountOf = (orgId: number) =>
    membersList.items.filter((m) => m.organization === orgId).length;

  if (pathname !== "/cooperatives") {
    return <Outlet />;
  }

  const columns: Column<ApiOrganizationFull>[] = [
    {
      key: "name",
      header: "Organization",
      render: (o) => (
        <div>
          <p className="font-medium text-foreground">{o.name}</p>
          <p className="text-xs text-muted-foreground">{o.registration_number ?? "—"}</p>
        </div>
      ),
      exportValue: (o) => o.name,
    },
    {
      key: "type",
      header: "Type",
      render: (o) => <Badge variant="secondary">{typeName(o.organization_type)}</Badge>,
      exportValue: (o) => typeName(o.organization_type),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <OrgStatusBadge status={o.status} />,
      exportValue: (o) => o.status,
    },
    {
      key: "verified",
      header: "Verified",
      render: (o) => (o.is_verified ? "Yes" : "No"),
      exportValue: (o) => (o.is_verified ? "yes" : "no"),
    },
    {
      key: "reliability",
      header: "Reliability",
      render: (o) => o.reliability_score,
      exportValue: (o) => o.reliability_score,
    },
    {
      key: "members",
      header: "Members",
      render: (o) => memberCountOf(o.id),
      exportValue: (o) => memberCountOf(o.id),
    },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline">
            <Link to="/cooperatives/$cooperativeId" params={{ cooperativeId: String(o.id) }}>
              View
            </Link>
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  const filters: FilterConfig<ApiOrganizationFull>[] = [
    {
      key: "type",
      label: "Type",
      options: types.map((t) => ({ value: String(t.id), label: t.name })),
      match: (o, v) => String(o.organization_type) === v,
    },
    {
      key: "status",
      label: "Status",
      options: (Object.keys(ORG_STATUS_LABELS) as OrganizationStatus[]).map((status) => ({
        value: status,
        label: ORG_STATUS_LABELS[status],
      })),
      match: (o, v) => o.status === v,
    },
  ];

  return (
    <AppShell
      title="Cooperatives"
      description="Organizations on the live AgriBridge API — cooperatives, distributors and more."
    >
      <StaffAccessNotice />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} title="Organizations" value={items.length} tone="brand" />
        <StatCard
          icon={CheckCircle2}
          title="Verified"
          value={items.filter((o) => o.is_verified).length}
          tone="success"
        />
        <StatCard
          icon={Ban}
          title="Suspended"
          value={items.filter((o) => o.status === "suspended").length}
          tone="warning"
        />
        <StatCard icon={Users} title="Total members" value={totalMembers} tone="soft" />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No organizations yet.</p>
      ) : (
        <DataTable
          rows={items}
          columns={columns}
          getRowId={(o) => String(o.id)}
          searchFields={(o) => `${o.name} ${o.registration_number ?? ""} ${o.tax_id ?? ""}`}
          filters={filters}
          exportFileName="organizations"
          paginate
          searchPlaceholder="Search by name, registration number or tax id…"
          emptyMessage="No organizations yet."
        />
      )}
    </AppShell>
  );
}
