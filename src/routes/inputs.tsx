import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Package, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column } from "@/components/data-table";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { locations, productById, type InputListing } from "@/lib/mock-data";

export const Route = createFileRoute("/inputs")({
  head: () => ({
    meta: [
      { title: "Input marketplace — Agribridge" },
      { name: "description", content: "Fertilizer, seed and pesticide listings from verified suppliers." },
    ],
  }),
  component: InputsPage,
});

function InputsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { inputListings, userById, can } = useWorkspace();

  if (pathname !== "/inputs") {
    return <Outlet />;
  }

  const columns: Column<InputListing>[] = [
    {
      key: "product",
      header: "Input",
      render: (l) => productById(l.productId)?.name ?? "—",
      exportValue: (l) => productById(l.productId)?.name ?? "",
    },
    {
      key: "price",
      header: "Price",
      render: (l) => `${formatRwf(l.price)}/${l.unit}`,
      exportValue: (l) => l.price,
    },
    {
      key: "stock",
      header: "In stock",
      render: (l) => formatQuantity(l.stockQty, l.unit),
      exportValue: (l) => l.stockQty,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (l) => userById(l.supplierId)?.name ?? "—",
      exportValue: (l) => userById(l.supplierId)?.name ?? "",
    },
    {
      key: "delivery",
      header: "Delivers to",
      render: (l) =>
        l.deliveryDistrictIds
          .map((id) => locations.find((loc) => loc.id === id)?.name)
          .filter(Boolean)
          .join(", "),
      exportValue: (l) =>
        l.deliveryDistrictIds.map((id) => locations.find((loc) => loc.id === id)?.name).join(", "),
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/inputs/$inputId" params={{ inputId: l.id }}>
            View
          </Link>
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      title="Input marketplace"
      description="Fertilizer, seed and pesticide from verified suppliers."
      actions={
        can("manageOwnInputs") && (
          <Button asChild>
            <Link to="/inputs/new">
              <Plus className="size-4" /> List an input
            </Link>
          </Button>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} title="Input listings" value={inputListings.length} tone="brand" />
        <StatCard
          icon={Package}
          title="Total stock (kg equiv.)"
          value={inputListings.reduce((s, l) => s + l.stockQty, 0).toLocaleString()}
          tone="soft"
        />
      </div>

      <DataTable
        rows={inputListings}
        columns={columns}
        getRowId={(l) => l.id}
        searchFields={(l) => `${productById(l.productId)?.name} ${userById(l.supplierId)?.name}`}
        exportFileName="input-listings"
        paginate
        searchPlaceholder="Search by input or supplier…"
        emptyMessage="No input listings yet."
      />
    </AppShell>
  );
}
