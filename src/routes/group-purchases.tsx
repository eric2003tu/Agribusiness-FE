import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Progress } from "@/components/ui/progress";
import { GroupPurchaseStatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity } from "@/lib/format";
import { productById, type GroupPurchase } from "@/lib/mock-data";

export const Route = createFileRoute("/group-purchases")({
  head: () => ({
    meta: [
      { title: "Group purchases — Agribridge" },
      { name: "description", content: "Farmers pooling input orders to unlock bulk supplier discounts." },
    ],
  }),
  component: GroupPurchasesPage,
});

function GroupPurchasesPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { groupPurchases, inputListings, pledgedQuantityFor } = useWorkspace();

  if (pathname !== "/group-purchases") {
    return <Outlet />;
  }

  const columns: Column<GroupPurchase>[] = [
    {
      key: "product",
      header: "Input",
      render: (g) => {
        const listing = inputListings.find((l) => l.id === g.inputListingId);
        return productById(listing?.productId)?.name ?? "—";
      },
      exportValue: (g) => productById(inputListings.find((l) => l.id === g.inputListingId)?.productId)?.name ?? "",
    },
    {
      key: "progress",
      header: "Progress",
      render: (g) => {
        const listing = inputListings.find((l) => l.id === g.inputListingId);
        const pledged = pledgedQuantityFor(g.id);
        const pct = Math.min(100, Math.round((pledged / g.thresholdQuantity) * 100));
        return (
          <div className="flex w-40 items-center gap-2">
            <Progress value={pct} className="w-24" />
            <span className="text-xs text-muted-foreground">
              {formatQuantity(pledged, listing?.unit ?? "kg")}
            </span>
          </div>
        );
      },
      exportValue: (g) => pledgedQuantityFor(g.id),
    },
    {
      key: "threshold",
      header: "Threshold",
      render: (g) => formatQuantity(g.thresholdQuantity, inputListings.find((l) => l.id === g.inputListingId)?.unit ?? "kg"),
      exportValue: (g) => g.thresholdQuantity,
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
      render: (g) => <GroupPurchaseStatusBadge status={g.status} />,
      exportValue: (g) => g.status,
    },
    {
      key: "actions",
      header: "",
      render: (g) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/group-purchases/$groupPurchaseId" params={{ groupPurchaseId: g.id }}>
            View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      title="Group purchases"
      description="Pool your input orders with nearby farmers for a bulk discount."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Boxes} title="Total" value={groupPurchases.length} tone="brand" />
        <StatCard
          icon={Boxes}
          title="Collecting"
          value={groupPurchases.filter((g) => g.status === "collecting").length}
          tone="warning"
        />
        <StatCard
          icon={Boxes}
          title="Fulfilled"
          value={groupPurchases.filter((g) => g.status === "fulfilled").length}
          tone="success"
        />
      </div>

      <DataTable
        rows={groupPurchases}
        columns={columns}
        getRowId={(g) => g.id}
        searchFields={(g) =>
          productById(inputListings.find((l) => l.id === g.inputListingId)?.productId)?.name ?? ""
        }
        exportFileName="group-purchases"
        paginate
        searchPlaceholder="Search by input…"
        emptyMessage="No group purchases yet — open one from an input listing."
      />
    </AppShell>
  );
}
