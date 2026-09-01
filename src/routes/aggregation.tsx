import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Handshake } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { AggregationStatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { productById, type AggregationGroup } from "@/lib/mock-data";

export const Route = createFileRoute("/aggregation")({
  head: () => ({
    meta: [
      { title: "Aggregation groups — Agribridge" },
      {
        name: "description",
        content: "Bulk aggregation groups combining several farmer listings into one buyer order.",
      },
    ],
  }),
  component: AggregationPage,
});

function AggregationPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { currentUser, aggregationGroups, buyerRequests, participantsForGroup, groupsForUser, can } =
    useWorkspace();

  if (pathname !== "/aggregation") {
    return <Outlet />;
  }
  const relevant = can("moderate") ? aggregationGroups : groupsForUser(currentUser.id);

  const columns: Column<AggregationGroup>[] = [
    {
      key: "request",
      header: "Product",
      render: (g) => {
        const request = buyerRequests.find((r) => r.id === g.requestId);
        return productById(request?.productId)?.name ?? "—";
      },
      exportValue: (g) => productById(buyerRequests.find((r) => r.id === g.requestId)?.productId)?.name ?? "",
    },
    {
      key: "target",
      header: "Target quantity",
      render: (g) => formatQuantity(g.targetQuantity, g.unit),
      exportValue: (g) => g.targetQuantity,
    },
    {
      key: "price",
      header: "Unit price",
      render: (g) => `${formatRwf(g.unitPrice)}/${g.unit}`,
      exportValue: (g) => g.unitPrice,
    },
    {
      key: "participants",
      header: "Farmers",
      render: (g) => participantsForGroup(g.id).length,
      exportValue: (g) => participantsForGroup(g.id).length,
    },
    {
      key: "deadline",
      header: "Deadline",
      render: (g) => g.deadline,
      exportValue: (g) => g.deadline,
    },
    {
      key: "status",
      header: "Status",
      render: (g) => <AggregationStatusBadge status={g.status} />,
      exportValue: (g) => g.status,
    },
    {
      key: "actions",
      header: "",
      render: (g) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/aggregation/$groupId" params={{ groupId: g.id }}>
            View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      title="Aggregation groups"
      description="Several small farmer listings combined into one bulk order."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Handshake} title="Total groups" value={relevant.length} tone="brand" />
        <StatCard
          icon={Handshake}
          title="Proposed"
          value={relevant.filter((g) => g.status === "proposed").length}
          tone="warning"
        />
        <StatCard
          icon={Handshake}
          title="Confirmed"
          value={relevant.filter((g) => g.status === "confirmed").length}
          tone="success"
        />
        <StatCard
          icon={Handshake}
          title="Partially confirmed"
          value={relevant.filter((g) => g.status === "partially_confirmed").length}
          tone="soft"
        />
      </div>

      <DataTable
        rows={relevant}
        columns={columns}
        getRowId={(g) => g.id}
        searchFields={(g) =>
          productById(buyerRequests.find((r) => r.id === g.requestId)?.productId)?.name ?? ""
        }
        exportFileName="aggregation-groups"
        paginate
        searchPlaceholder="Search by product…"
        emptyMessage="No aggregation groups yet — post or run one from a buyer request."
      />
    </AppShell>
  );
}
