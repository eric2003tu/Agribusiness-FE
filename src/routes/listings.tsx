import { useMemo, useState } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Sprout,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingStatusBadge } from "@/components/status-badge";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import {
  DISTRICTS,
  LISTING_STATUS_LABELS,
  districtOf,
  locationLabel,
  productById,
  products,
  type ListingStatus,
  type ProduceListing,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const produceProducts = products.filter((p) => p.type === "produce");
const PAGE_SIZE = 9;

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
        content: "Browse farmer produce listings across Rwanda and add them to your cart.",
      },
    ],
  }),
  component: ListingsPage,
});

function ListingCard({ listing }: { listing: ProduceListing }) {
  const { userById, currentUser, addToCart } = useWorkspace();
  const [qty, setQty] = useState("1");
  const product = productById(listing.productId);
  const seller = userById(listing.sellerId);
  const isOwner = currentUser.id === listing.sellerId;
  const canBuy = !isOwner && listing.status === "available";
  const maxQty = listing.quantity;

  return (
    <div
      className={cn(
        "surface-card flex flex-col overflow-hidden transition-shadow hover:shadow-md",
        listing.status !== "available" && "opacity-80",
      )}
    >
      <div className="relative">
        {listing.photos && listing.photos[0] ? (
          <img src={listing.photos[0]} alt={product?.name ?? "Listing"} className="h-44 w-full object-cover" />
        ) : (
          <ProductIllustration productId={listing.productId} className="h-44 w-full" rounded="rounded-none" />
        )}
        <div className="absolute right-2 top-2">
          <ListingStatusBadge status={listing.status} />
        </div>
        {isOwner && (
          <div className="absolute left-2 top-2">
            <Badge className="bg-background/90 text-foreground" variant="outline">
              Your listing
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-base font-semibold text-foreground">{product?.name ?? "Product"}</p>
        <p className="text-sm text-muted-foreground">{formatQuantity(listing.quantity, listing.unit)} available</p>
        <p className="mt-2 text-lg font-semibold text-foreground">
          {listing.unitPrice ? (
            <>
              {formatRwf(listing.unitPrice)}
              <span className="text-sm font-normal text-muted-foreground">/{listing.unit}</span>
            </>
          ) : (
            <span className="text-base font-medium text-muted-foreground">Negotiable</span>
          )}
          {listing.negotiable && listing.unitPrice && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(negotiable)</span>
          )}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{locationLabel(listing.locationId)}</span>
          <span className="shrink-0">{listing.listingScope === "peer" ? "Peer-to-peer" : "Commercial"}</span>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{seller?.name ?? "—"}</span>
          <ReliabilityBadge score={seller?.reliabilityScore ?? 0} />
        </div>

        <div className="mt-4 flex-1" />

        {isOwner ? (
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link to="/listings/$listingId" params={{ listingId: listing.id }}>
              Manage listing
            </Link>
          </Button>
        ) : canBuy ? (
          listing.negotiable ? (
            <Button asChild className="mt-2 w-full">
              <Link to="/listings/$listingId" params={{ listingId: listing.id }}>
                Make an offer
              </Link>
            </Button>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center rounded-md border border-input">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => setQty(String(Math.max(1, Number(qty) - 1)))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3.5" />
                </Button>
                <Input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="h-8 w-14 border-0 text-center shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => setQty(String(Math.min(maxQty, Number(qty) + 1)))}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
              <Button
                className="flex-1"
                onClick={() => {
                  const n = Number(qty);
                  if (n > 0 && n <= maxQty) addToCart("produce", listing.id, n);
                }}
              >
                <ShoppingCart className="size-4" /> Add to cart
              </Button>
            </div>
          )
        ) : (
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link to="/listings/$listingId" params={{ listingId: listing.id }}>
              View details
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function ListingsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { product: productParam, district: districtParam } = Route.useSearch();
  const { produceListings, can } = useWorkspace();

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState(productParam ?? "all");
  const [districtFilter, setDistrictFilter] = useState(districtParam ?? "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [page, setPage] = useState(1);

  // All hooks must run unconditionally on every render — this component stays
  // mounted across the /listings <-> /listings/new <-> /listings/$id
  // transition (handled below via the pathname check), so anything hook-like
  // has to sit above that check, not after it.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return produceListings.filter((l) => {
      if (productFilter !== "all" && l.productId !== productFilter) return false;
      if (districtFilter !== "all" && districtOf(l.locationId)?.id !== districtFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (scopeFilter !== "all" && l.listingScope !== scopeFilter) return false;
      if (term && !(productById(l.productId)?.name ?? "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [produceListings, search, productFilter, districtFilter, statusFilter, scopeFilter]);

  if (pathname !== "/listings") {
    return <Outlet />;
  }

  // A deep link can name a product+district combination with no listings yet
  // (e.g. from the market-prices page, which has price data for every
  // district). Rather than land on a dead, empty grid, drop the district
  // filter and say so.
  const comboHasListings =
    !productParam || !districtParam
      ? true
      : produceListings.some((l) => l.productId === productParam && districtOf(l.locationId)?.id === districtParam);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters =
    search.trim() !== "" || productFilter !== "all" || districtFilter !== "all" || statusFilter !== "all" || scopeFilter !== "all";

  function clearFilters() {
    setSearch("");
    setProductFilter("all");
    setDistrictFilter("all");
    setStatusFilter("all");
    setScopeFilter("all");
    setPage(1);
  }

  return (
    <AppShell
      title="Produce listings"
      description="Every farmer offer currently on the marketplace — add what you need to your cart."
      actions={
        can("manageOwnListings") && (
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

      {!comboHasListings && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning-foreground">
          No {productById(productParam)?.name ?? "matching"} listings in{" "}
          {DISTRICTS.find((d) => d.id === districtParam)?.name ?? "that district"} right now — showing all
          districts instead.
        </div>
      )}

      <div className="surface-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product…"
              className="pl-9"
            />
          </div>
          <Select
            value={productFilter}
            onValueChange={(v) => {
              setProductFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44"><SelectValue placeholder="All products" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {produceProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={districtFilter}
            onValueChange={(v) => {
              setDistrictFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44"><SelectValue placeholder="All districts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All districts</SelectItem>
              {DISTRICTS.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {Object.entries(LISTING_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value as ListingStatus}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={scopeFilter}
            onValueChange={(v) => {
              setScopeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40"><SelectValue placeholder="All scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scope</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="peer">Peer-to-peer</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="surface-card p-12 text-center text-sm text-muted-foreground">
          No listings match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {filtered.length} listings
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
