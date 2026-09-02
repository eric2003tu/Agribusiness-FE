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
import {
  DISTRICTS,
  LISTING_STATUS_LABELS,
  districtOf,
  locationLabel,
  productById,
  products,
  type ProduceListing,
} from "@/lib/mock-data";

const produceProducts = products.filter((p) => p.type === "produce");

export const Route = createFileRoute("/listings")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { product?: string | undefined; district?: string | undefined } => ({
    product: typeof search["product"] === "string" ? search["product"] : undefined,
    district: typeof search["district"] === "string" ? search["district"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Produce listings — Agribridge" },
      {
        name: "description",
        content: "Browse and manage farmer produce listings across Rwanda.",
      },
    ],
  }),
  component: ListingsPage,
});

function ListingsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { product: productParam, district: districtParam } = Route.useSearch();
  const { produceListings, userById, expireListing, can } = useWorkspace();

  if (pathname !== "/listings") {
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
      key: "seller",
      header: "Seller",
      render: (l) => userById(l.sellerId)?.name ?? "—",
      exportValue: (l) => userById(l.sellerId)?.name ?? "",
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
      key: "product",
      label: "Product",
      options: produceProducts.map((p) => ({ value: p.id, label: p.name })),
      match: (l, v) => l.productId === v,
    },
    {
      key: "district",
      label: "District",
      options: DISTRICTS.map((d) => ({ value: d.id, label: d.name })),
      match: (l, v) => districtOf(l.locationId)?.id === v,
    },
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
      title="Produce listings"
      description="Every farmer offer currently on the marketplace — browse by product or district to find the best price."
      actions={
        (can("manageOwnListings")) && (
          <Button asChild>
            <Link to="/listings/new">
              <Plus className="size-4" /> New listing
            </Link>
          </Button>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sprout}
          title="Available"
          value={produceListings.filter((l) => l.status === "available").length}
          tone="brand"
        />
        <StatCard
          icon={Clock}
          title="Reserved"
          value={produceListings.filter((l) => l.status === "reserved").length}
          tone="warning"
        />
        <StatCard
          icon={CheckCircle2}
          title="Sold"
          value={produceListings.filter((l) => l.status === "sold").length}
          tone="success"
        />
        <StatCard
          icon={XCircle}
          title="Expired"
          value={produceListings.filter((l) => l.status === "expired").length}
          tone="soft"
        />
      </div>

      <DataTable
        key={`${productParam ?? ""}-${districtParam ?? ""}`}
        rows={produceListings}
        columns={columns}
        getRowId={(l) => l.id}
        searchFields={(l) => `${productById(l.productId)?.name} ${userById(l.sellerId)?.name}`}
        filters={filters}
        initialFilters={{
          ...(productParam ? { product: productParam } : {}),
          ...(districtParam ? { district: districtParam } : {}),
        }}
        exportFileName="produce-listings"
        paginate
        searchPlaceholder="Search by product or seller…"
        toolbarActions={
          can("moderate")
            ? (ids, clear) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    ids.forEach((id) => expireListing(id));
                    clear();
                  }}
                >
                  Expire selected
                </Button>
              )
            : undefined
        }
        emptyMessage="No listings match your filters."
      />
    </AppShell>
  );
}
