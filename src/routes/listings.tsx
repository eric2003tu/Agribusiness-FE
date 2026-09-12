import { useMemo, useState } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Loader2, Plus, Search, Sprout, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiList } from "@/hooks/use-api-list";
import { getStoredApiUser } from "@/lib/api/auth";
import { getTokens } from "@/lib/api/client";
import { listListingsApi } from "@/lib/api/listings";
import { listProductsApi, listVariantsApi } from "@/lib/api/products";
import { listLocationsApi, listUomsApi } from "@/lib/api/reference";
import type { ApiListing, ApiProduct, ApiUom, ApiVariant, ListingStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listings")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { product?: string | undefined; district?: string | undefined } => ({
    product: typeof search["product"] === "string" ? search["product"] : undefined,
    district: typeof search["district"] === "string" ? search["district"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Marketplace — Agribridge" },
      {
        name: "description",
        content: "Browse farmer produce listings from the live AgriBridge API.",
      },
    ],
  }),
  component: ListingsPage,
});

const LISTING_STATUS_META: Record<ListingStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-success/12 text-success" },
  reserved: { label: "Reserved", className: "bg-warning/20 text-warning-foreground" },
  sold: { label: "Sold", className: "bg-primary-soft text-primary" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
};

function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const meta = LISTING_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        meta.className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function ListingCard({
  listing,
  product,
  variant,
  uom,
  locationName,
}: {
  listing: ApiListing;
  product: ApiProduct | undefined;
  variant: ApiVariant | undefined;
  uom: ApiUom | undefined;
  locationName: string;
}) {
  const price = listing.unit_price != null ? Number(listing.unit_price) : null;
  const qty = Number(listing.qty_available);

  return (
    <div className="surface-card flex flex-col p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {product?.name ?? (variant?.name || "Product")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {variant?.name ?? `Variant #${listing.variant}`}
          </p>
        </div>
        <ListingStatusBadge status={listing.status} />
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {qty.toLocaleString("en-US")}{" "}
        <span className="text-sm font-normal text-muted-foreground">{uom?.name}</span>
      </p>

      <p className="mt-1 text-lg font-semibold text-foreground">
        {price != null ? (
          <>
            RWF {price.toLocaleString("en-US")}
            <span className="text-sm font-normal text-muted-foreground">
              /{uom?.name ?? "unit"}
            </span>
          </>
        ) : (
          <span className="text-base font-medium text-muted-foreground">Negotiable</span>
        )}
        {listing.negotiable && price != null && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(negotiable)</span>
        )}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{locationName}</span>
        <span className="shrink-0">{listing.scope === "peer" ? "Peer-to-peer" : "Commercial"}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="truncate">
          {listing.seller_user != null
            ? `User #${listing.seller_user}`
            : `Org #${listing.seller_org}`}
        </span>
        <span className="shrink-0">Harvested {listing.harvest_date}</span>
      </div>

      <Button asChild variant="outline" className="mt-4 w-full">
        <Link to="/listings/$listingId" params={{ listingId: String(listing.id) }}>
          View details
        </Link>
      </Button>
    </div>
  );
}

function ListingsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { product: productParam, district: districtParam } = Route.useSearch();

  const [search, setSearch] = useState(productParam ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // All hooks must run unconditionally on every render — this component stays
  // mounted across the /listings <-> /listings/new <-> /listings/$listingId
  // transition (handled below via the pathname check), so anything hook-like
  // has to sit above that check, not after it.
  const listingsList = useApiList(
    () =>
      listListingsApi({
        page_size: 100,
        ...(statusFilter !== "all" ? { status: statusFilter as ListingStatus } : {}),
        ...(scopeFilter !== "all" ? { scope: scopeFilter as "peer" | "commercial" } : {}),
      }),
    [statusFilter, scopeFilter],
  );

  const productsList = useApiList(() => listProductsApi({ is_active: true, page_size: 100 }), []);
  const variantsList = useApiList(() => listVariantsApi({ is_active: true, page_size: 300 }), []);
  const uomsList = useApiList(() => listUomsApi({ page_size: 100 }), []);
  const locationsList = useApiList(() => listLocationsApi({ page_size: 300 }), []);

  const productById = useMemo(
    () => new Map(productsList.items.map((p) => [p.id, p] as const)),
    [productsList.items],
  );
  const variantById = useMemo(
    () => new Map(variantsList.items.map((v) => [v.id, v] as const)),
    [variantsList.items],
  );
  const uomById = useMemo(
    () => new Map(uomsList.items.map((u) => [u.id, u] as const)),
    [uomsList.items],
  );
  const locationById = useMemo(
    () => new Map(locationsList.items.map((l) => [l.id, l.name] as const)),
    [locationsList.items],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    return listingsList.items.filter((l) => {
      if (term) {
        const productName =
          productById.get(l.variant)?.name ?? variantById.get(l.variant)?.name ?? "";
        const haystack = `${productName} ${l.grade}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (!Number.isNaN(min) && (l.unit_price == null || Number(l.unit_price) < min)) return false;
      if (!Number.isNaN(max) && (l.unit_price == null || Number(l.unit_price) > max)) return false;
      return true;
    });
  }, [listingsList.items, search, minPrice, maxPrice, productById, variantById]);

  const hasRealSession = Boolean(getStoredApiUser() && getTokens());

  if (pathname !== "/listings") {
    return <Outlet />;
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    scopeFilter !== "all" ||
    minPrice.trim() !== "" ||
    maxPrice.trim() !== "";

  const isBusy = listingsList.loading && listingsList.items.length === 0;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setScopeFilter("all");
    setMinPrice("");
    setMaxPrice("");
  }

  return (
    <AppShell
      title="Marketplace"
      description="Every farmer offer currently on the live AgriBridge API — browse produce and inputs."
    >
      {districtParam && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning-foreground">
          The live listings API doesn't filter by district — district filtering isn't applied here.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sprout}
          title="Available"
          value={filtered.filter((l) => l.status === "available").length}
          tone="brand"
        />
        <StatCard
          icon={Clock3}
          title="Reserved"
          value={filtered.filter((l) => l.status === "reserved").length}
          tone="warning"
        />
        <StatCard
          icon={CheckCircle2}
          title="Sold"
          value={filtered.filter((l) => l.status === "sold").length}
          tone="success"
        />
        <StatCard
          icon={XCircle}
          title="Expired"
          value={filtered.filter((l) => l.status === "expired").length}
          tone="soft"
        />
      </div>

      <div className="surface-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[13rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product or grade…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {Object.entries(LISTING_STATUS_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scope</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="peer">Peer-to-peer</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            type="number"
            min={0}
            placeholder="Min price"
            className="w-28"
          />
          <Input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            type="number"
            min={0}
            placeholder="Max price"
            className="w-28"
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
          {hasRealSession && (
            <Button asChild size="sm">
              <Link to="/listings/new">
                <Plus className="size-4" /> Add listing
              </Link>
            </Button>
          )}
        </div>
      </div>

      {listingsList.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {listingsList.error}
        </div>
      )}

      {isBusy ? (
        <div className="surface-card flex items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading live listings…
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-12 text-center text-sm text-muted-foreground">
          No listings match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              product={productById.get(listing.variant)}
              variant={variantById.get(listing.variant)}
              uom={uomById.get(listing.uom)}
              locationName={locationById.get(listing.location) ?? `Location #${listing.location}`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} live listing{filtered.length === 1 ? "" : "s"} loaded
        </p>
        {listingsList.hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void listingsList.loadMore()}
            disabled={listingsList.loading}
          >
            <Plus className="size-4" /> Load more
          </Button>
        )}
      </div>
    </AppShell>
  );
}
