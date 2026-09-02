import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Plus, ShoppingBasket, CheckCircle2, Clock, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { RequestStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { REQUEST_STATUS_LABELS, locationLabel, productById, type BuyerRequest } from "@/lib/mock-data";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Buyer requests — Agribridge" },
      { name: "description", content: "Bulk and individual buyer requests looking for produce." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { buyerRequests, userById, can } = useWorkspace();

  if (pathname !== "/requests") {
    return <Outlet />;
  }

  const columns: Column<BuyerRequest>[] = [
    {
      key: "product",
      header: "Product",
      render: (r) => (
        <div className="flex items-center gap-3">
          <ProductIllustration productId={r.productId} className="size-10" rounded="rounded-lg" />
          <span className="font-medium text-foreground">{productById(r.productId)?.name ?? "—"}</span>
        </div>
      ),
      exportValue: (r) => productById(r.productId)?.name ?? "",
    },
    {
      key: "quantity",
      header: "Quantity needed",
      render: (r) => formatQuantity(r.quantityNeeded, r.unit),
      exportValue: (r) => r.quantityNeeded,
    },
    {
      key: "target",
      header: "Target price",
      render: (r) => (r.targetPrice ? `${formatRwf(r.targetPrice)}/${r.unit}` : "Open"),
      exportValue: (r) => r.targetPrice ?? "open",
    },
    {
      key: "delivery",
      header: "Delivery to",
      render: (r) => locationLabel(r.deliveryLocationId),
      exportValue: (r) => locationLabel(r.deliveryLocationId),
    },
    {
      key: "buyer",
      header: "Buyer",
      render: (r) => userById(r.buyerId)?.name ?? "—",
      exportValue: (r) => userById(r.buyerId)?.name ?? "",
    },
    {
      key: "neededBy",
      header: "Needed by",
      render: (r) => r.neededByDate,
      exportValue: (r) => r.neededByDate,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <RequestStatusBadge status={r.status} />,
      exportValue: (r) => r.status,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/requests/$requestId" params={{ requestId: r.id }}>
            View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  const filters: FilterConfig<BuyerRequest>[] = [
    {
      key: "status",
      label: "Status",
      options: Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => ({ value, label })),
      match: (r, v) => r.status === v,
    },
  ];

  return (
    <AppShell
      title="Buyer requests"
      description="What buyers are looking for right now."
      actions={
        can("manageOwnRequests") && (
          <Button asChild>
            <Link to="/requests/new">
              <Plus className="size-4" /> New request
            </Link>
          </Button>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShoppingBasket}
          title="Open"
          value={buyerRequests.filter((r) => r.status === "open").length}
          tone="brand"
        />
        <StatCard
          icon={Clock}
          title="Partially filled"
          value={buyerRequests.filter((r) => r.status === "partially_filled").length}
          tone="warning"
        />
        <StatCard
          icon={CheckCircle2}
          title="Filled"
          value={buyerRequests.filter((r) => r.status === "filled").length}
          tone="success"
        />
        <StatCard
          icon={XCircle}
          title="Cancelled"
          value={buyerRequests.filter((r) => r.status === "cancelled").length}
          tone="soft"
        />
      </div>

      <DataTable
        rows={buyerRequests}
        columns={columns}
        getRowId={(r) => r.id}
        searchFields={(r) => `${productById(r.productId)?.name} ${userById(r.buyerId)?.name}`}
        filters={filters}
        exportFileName="buyer-requests"
        paginate
        searchPlaceholder="Search by product or buyer…"
        emptyMessage="No requests match your filters."
      />
    </AppShell>
  );
}
