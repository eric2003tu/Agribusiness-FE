import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Plus, Sprout, CheckCircle2, Clock, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { ListingStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { LISTING_STATUS_LABELS, locationLabel, productById, type ProduceListing } from "@/lib/mock-data";

export const Route = createFileRoute("/my-listings")({
  head: () => ({
    meta: [
      { title: "My listings — Agribridge" },
      { name: "description", content: "Manage the produce you've listed for sale." },
    ],
  }),
  component: MyListingsPage,
});

function MyListingsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { myListings, deleteListing, can } = useWorkspace();

  if (pathname !== "/my-listings") {
    return <Outlet />;
  }

  const columns: Column<ProduceListing>[] = [
    {
      key: "product",
      header: "Product",
      render: (l) => (
        <div className="flex items-center gap-3">
          <ProductIllustration productId={l.productId} className="size-10" rounded="rounded-lg" />
          <span className="font-medium text-foreground">{productById(l.productId)?.name ?? "—"}</span>
        </div>
      ),
      exportValue: (l) => productById(l.productId)?.name ?? "",
    },
    {
      key: "quantity",
      header: "Quantity",
      render: (l) => formatQuantity(l.quantity, l.unit),
      exportValue: (l) => l.quantity,
    },
    {
      key: "price",
      header: "Price",
      render: (l) => (l.unitPrice ? `${formatRwf(l.unitPrice)}/${l.unit}` : "Negotiable"),
      exportValue: (l) => l.unitPrice ?? "negotiable",
    },
    {
      key: "location",
      header: "Location",
      render: (l) => locationLabel(l.locationId),
      exportValue: (l) => locationLabel(l.locationId),
    },
    {
      key: "scope",
      header: "Scope",
      render: (l) => (l.listingScope === "peer" ? "Peer-to-peer" : "Commercial"),
      exportValue: (l) => l.listingScope,
    },
    {
      key: "status",
      header: "Status",
      render: (l) => <ListingStatusBadge status={l.status} />,
      exportValue: (l) => l.status,
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/listings/$listingId" params={{ listingId: l.id }}>
            View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  const filters: FilterConfig<ProduceListing>[] = [
    {
      key: "status",
      label: "Status",
      options: Object.entries(LISTING_STATUS_LABELS).map(([value, label]) => ({ value, label })),
      match: (l, v) => l.status === v,
    },
    {
      key: "scope",
      label: "Scope",
      options: [
        { value: "peer", label: "Peer-to-peer" },
        { value: "commercial", label: "Commercial" },
      ],
      match: (l, v) => l.listingScope === v,
    },
  ];

  return (
    <AppShell
      allowedRoles={["farmer"]}
      title="My listings"
      description="Everything you've listed for sale, in one place."
      actions={
        <Button asChild>
          <Link to="/listings/new">
            <Plus className="size-4" /> New listing
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sprout}
          title="Available"
          value={myListings.filter((l) => l.status === "available").length}
          tone="brand"
        />
        <StatCard
          icon={Clock}
          title="Reserved"
          value={myListings.filter((l) => l.status === "reserved").length}
          tone="warning"
        />
        <StatCard
          icon={CheckCircle2}
          title="Sold"
          value={myListings.filter((l) => l.status === "sold").length}
          tone="success"
        />
        <StatCard
          icon={XCircle}
          title="Expired"
          value={myListings.filter((l) => l.status === "expired").length}
          tone="soft"
        />
      </div>

      <DataTable
        rows={myListings}
        columns={columns}
        getRowId={(l) => l.id}
        searchFields={(l) => productById(l.productId)?.name ?? ""}
        filters={filters}
        exportFileName="my-listings"
        paginate
        searchPlaceholder="Search by product…"
        toolbarActions={
          can("manageOwnListings")
            ? (ids, clear) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    ids.forEach((id) => deleteListing(id));
                    clear();
                  }}
                >
                  Delete selected
                </Button>
              )
            : undefined
        }
        emptyMessage="You haven't listed any produce yet."
      />
    </AppShell>
  );
}
