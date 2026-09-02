import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Building2, MapPinned, Package, PackageX, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column, type FilterConfig } from "@/components/data-table";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import {
  categories,
  categoryById,
  districtOf,
  DISTRICTS,
  locationById,
  productById,
  type InputListing,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inputs")({
  head: () => ({
    meta: [
      { title: "Input marketplace — Agribridge" },
      { name: "description", content: "Fertilizer, seed and pesticide listings from verified suppliers." },
    ],
  }),
  component: InputsPage,
});

const INPUT_CATEGORIES = categories.filter((c) => c.type === "input" && c.parentId === "cat-inputs");

const CATEGORY_STYLES: Record<string, string> = {
  "cat-fertilizer": "bg-primary-soft text-primary",
  "cat-seed": "bg-success/12 text-success",
  "cat-pesticide": "bg-warning/20 text-warning-foreground",
};

function categoryOf(input: InputListing) {
  return categoryById(productById(input.productId)?.categoryId);
}

function CategoryBadge({ input }: { input: InputListing }) {
  const category = categoryOf(input);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        (category && CATEGORY_STYLES[category.id]) || "bg-muted text-muted-foreground",
      )}
    >
      {category?.name ?? "Input"}
    </span>
  );
}

function InputsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { inputListings, userById, can } = useWorkspace();

  if (pathname !== "/inputs") {
    return <Outlet />;
  }

  const suppliers = new Set(inputListings.map((l) => l.supplierId));
  const verifiedSuppliers = [...suppliers].filter((id) => userById(id)?.isVerified).length;
  const districtsServed = new Set(inputListings.flatMap((l) => l.deliveryDistrictIds)).size;
  const outOfStock = inputListings.filter((l) => l.stockQty === 0).length;

  const columns: Column<InputListing>[] = [
    {
      key: "product",
      header: "Input",
      render: (l) => (
        <div className="flex items-center gap-3">
          <ProductIllustration productId={l.productId} className="size-10" rounded="rounded-lg" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{productById(l.productId)?.name ?? "—"}</p>
            <div className="mt-1">
              <CategoryBadge input={l} />
            </div>
          </div>
        </div>
      ),
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
      render: (l) =>
        l.stockQty === 0 ? (
          <span className="font-medium text-destructive">Out of stock</span>
        ) : (
          formatQuantity(l.stockQty, l.unit)
        ),
      exportValue: (l) => l.stockQty,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (l) => {
        const supplier = userById(l.supplierId);
        return (
          <div className="flex items-center gap-1.5">
            <span>{supplier?.name ?? "—"}</span>
            {supplier?.isVerified && (
              <ShieldCheck className="size-3.5 shrink-0 text-success" aria-label="Verified supplier" />
            )}
          </div>
        );
      },
      exportValue: (l) => userById(l.supplierId)?.name ?? "",
    },
    {
      key: "reliability",
      header: "Reliability",
      render: (l) => <ReliabilityBadge score={userById(l.supplierId)?.reliabilityScore ?? 0} />,
      exportValue: (l) => userById(l.supplierId)?.reliabilityScore ?? 0,
    },
    {
      key: "delivery",
      header: "Delivers to",
      render: (l) => {
        const names = l.deliveryDistrictIds.map((id) => locationById(id)?.name).filter(Boolean);
        return names.length > 0 ? names.join(", ") : "Not specified";
      },
      exportValue: (l) =>
        l.deliveryDistrictIds.map((id) => locationById(id)?.name).filter(Boolean).join(", "),
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

  const filters: FilterConfig<InputListing>[] = [
    {
      key: "category",
      label: "Category",
      options: INPUT_CATEGORIES.map((c) => ({ value: c.id, label: c.name })),
      match: (l, v) => categoryOf(l)?.id === v,
    },
    {
      key: "district",
      label: "District",
      options: DISTRICTS.map((d) => ({ value: d.id, label: d.name })),
      match: (l, v) => l.deliveryDistrictIds.some((id) => districtOf(id)?.id === v),
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
          icon={ShieldCheck}
          title="Verified suppliers"
          value={`${verifiedSuppliers}/${suppliers.size}`}
          tone={verifiedSuppliers === suppliers.size ? "success" : "warning"}
        />
        <StatCard icon={MapPinned} title="Districts served" value={districtsServed} tone="soft" />
        <StatCard
          icon={outOfStock ? PackageX : Building2}
          title="Out of stock"
          value={outOfStock}
          tone={outOfStock ? "danger" : "success"}
        />
      </div>

      <DataTable
        rows={inputListings}
        columns={columns}
        getRowId={(l) => l.id}
        searchFields={(l) => `${productById(l.productId)?.name} ${userById(l.supplierId)?.name}`}
        filters={filters}
        exportFileName="input-listings"
        paginate
        searchPlaceholder="Search by input or supplier…"
        emptyMessage="No input listings match your filters."
      />
    </AppShell>
  );
}
