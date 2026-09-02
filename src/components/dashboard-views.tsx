import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Handshake,
  Package,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Sprout,
  Truck,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ListingStatusBadge, TransactionStatusBadge } from "@/components/status-badge";
import { NotificationFeed } from "@/components/notification-feed";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf, formatQuantity } from "@/lib/format";
import {
  LISTING_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  ROLE_LABELS,
  TRANSACTION_STATUS_LABELS,
  productById,
  locationLabel,
  type ListingStatus,
  type RequestStatus,
  type Role,
  type TransactionStatus,
} from "@/lib/mock-data";

const CHART_PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function buildConfig<T extends string>(
  keys: readonly T[],
  labels: Record<T, string>,
  colors?: Partial<Record<T, string>>,
): ChartConfig {
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      { label: labels[key], color: colors?.[key] ?? CHART_PALETTE[i % CHART_PALETTE.length] ?? "var(--chart-1)" },
    ]),
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* --------------------------------- Farmer -------------------------------- */

const LISTING_STATUS_COLORS: Record<ListingStatus, string> = {
  available: "var(--chart-1)",
  reserved: "var(--warning)",
  sold: "var(--success)",
  expired: "var(--muted-foreground)",
};

export function FarmerDashboard() {
  const {
    currentUser,
    myListings,
    aggregationParticipants,
    produceListings,
    transactions,
    notificationsForUser,
    respondToAggregation,
  } = useWorkspace();
  const active = myListings.filter((l) => l.status === "available" || l.status === "reserved");
  const myPending = aggregationParticipants.filter(
    (p) => p.farmerId === currentUser.id && p.status === "pending",
  );
  const notifications = notificationsForUser(currentUser.id);

  const listingsByStatus = useMemo(() => {
    const order: ListingStatus[] = ["available", "reserved", "sold", "expired"];
    return order
      .map((status) => ({
        status,
        label: LISTING_STATUS_LABELS[status],
        count: myListings.filter((l) => l.status === status).length,
      }))
      .filter((row) => row.count > 0);
  }, [myListings]);

  const earningsByProduct = useMemo(() => {
    const completed = transactions.filter(
      (t) => t.sellerId === currentUser.id && t.status === "completed",
    );
    const totals = new Map<string, number>();
    completed.forEach((t) => {
      const name = productById(t.productId)?.name ?? "Other";
      totals.set(name, (totals.get(name) ?? 0) + t.quantity * t.unitPrice);
    });
    return Array.from(totals.entries())
      .map(([product, revenue]) => ({ product, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [transactions, currentUser.id]);

  const totalEarnings = earningsByProduct.reduce((s, r) => s + r.revenue, 0);

  const listingsChartConfigByStatus: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        listingsByStatus.map((row) => [
          row.status,
          { label: row.label, color: LISTING_STATUS_COLORS[row.status] },
        ]),
      ),
    [listingsByStatus],
  );

  const earningsOverTime = useMemo(() => {
    const completed = transactions
      .filter((t) => t.sellerId === currentUser.id && t.status === "completed" && t.completedAt)
      .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
    let running = 0;
    return completed.map((t) => {
      running += t.quantity * t.unitPrice;
      return { date: t.completedAt as string, cumulative: running };
    });
  }, [transactions, currentUser.id]);

  const earningsChartConfig: ChartConfig = { revenue: { label: "Revenue (RWF)", color: "var(--chart-2)" } };
  const earningsTrendConfig: ChartConfig = { cumulative: { label: "Cumulative earnings (RWF)", color: "var(--chart-3)" } };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Sprout} title="Active listings" value={active.length} tone="brand" />
        <StatCard
          icon={Handshake}
          title="Aggregation invites"
          value={myPending.length}
          tone={myPending.length ? "warning" : "success"}
          hint="Awaiting your response"
        />
        <StatCard
          icon={ShieldCheck}
          title="Reliability score"
          value={`${currentUser.reliabilityScore}/100`}
          tone="soft"
        />
        <StatCard
          icon={CheckCircle2}
          title="Sold this season"
          value={myListings.filter((l) => l.status === "sold").length}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Listings by status" subtitle="Where your inventory stands right now">
          {listingsByStatus.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">List your first harvest to see this chart.</p>
          ) : (
            <ChartContainer config={listingsChartConfigByStatus} className="mx-auto h-56 w-full max-w-xs p-4">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                <Pie
                  data={listingsByStatus}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={45}
                  outerRadius={75}
                  strokeWidth={2}
                >
                  {listingsByStatus.map((row) => (
                    <Cell key={row.status} fill={LISTING_STATUS_COLORS[row.status]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          )}
        </Panel>

        <Panel
          title="Earnings over time"
          subtitle={totalEarnings > 0 ? `${formatRwf(totalEarnings)} earned so far` : "No completed sales yet"}
        >
          {earningsOverTime.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Your cumulative earnings will chart here once sales complete.
            </p>
          ) : (
            <ChartContainer config={earningsTrendConfig} className="h-56 w-full p-4">
              <AreaChart data={earningsOverTime}>
                <defs>
                  <linearGradient id="farmerEarningsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} />
                <Area
                  dataKey="cumulative"
                  type="monotone"
                  stroke="var(--chart-3)"
                  fill="url(#farmerEarningsFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </Panel>
      </div>

      {earningsByProduct.length > 0 && (
        <Panel title="Revenue by product" subtitle="Top-earning products from completed sales">
          <ChartContainer config={earningsChartConfig} className="h-56 w-full p-4">
            <BarChart data={earningsByProduct}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="product" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Panel>
      )}

      {myPending.length > 0 && (
        <Panel title="Aggregation invites waiting on you" subtitle="Accept or decline within 24h">
          <ul className="divide-y divide-border">
            {myPending.map((p) => {
              const listing = produceListings.find((l) => l.id === p.listingId);
              const product = productById(listing?.productId);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatQuantity(p.allocatedQuantity, listing?.unit ?? "kg")} of {product?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Agreed price {formatRwf(p.agreedUnitPrice)}/{listing?.unit}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => respondToAggregation(p.id, false)}>
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => respondToAggregation(p.id, true)}>
                    Accept
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="My listings"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/my-listings">Manage all</Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {myListings.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground">
                  You haven't listed any produce yet.
                </li>
              )}
              {myListings.slice(0, 6).map((l) => {
                const product = productById(l.productId);
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatQuantity(l.quantity, l.unit)} · {locationLabel(l.locationId)}
                      </p>
                    </div>
                    <ListingStatusBadge status={l.status} />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Notifications">
          <div className="p-2">
            <NotificationFeed items={notifications} limit={6} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------- Buyer --------------------------------- */

const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  open: "var(--chart-1)",
  partially_filled: "var(--warning)",
  filled: "var(--success)",
  cancelled: "var(--muted-foreground)",
};

export function BuyerDashboard() {
  const {
    currentUser,
    myRequests,
    groupsForUser,
    matchingListingsForRequest,
    transactions,
    notificationsForUser,
  } = useWorkspace();
  const open = myRequests.filter((r) => r.status === "open" || r.status === "partially_filled");
  const groups = groupsForUser(currentUser.id);
  const needingAggregation = open.filter((r) => matchingListingsForRequest(r.id).length > 0);
  const notifications = notificationsForUser(currentUser.id);

  const requestsByStatus = useMemo(() => {
    const order: RequestStatus[] = ["open", "partially_filled", "filled", "cancelled"];
    return order
      .map((status) => ({
        status,
        label: REQUEST_STATUS_LABELS[status],
        count: myRequests.filter((r) => r.status === status).length,
      }))
      .filter((row) => row.count > 0);
  }, [myRequests]);
  const requestsChartConfig = useMemo(
    () => buildConfig(requestsByStatus.map((r) => r.status), REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS),
    [requestsByStatus],
  );

  const myCompletedPurchases = transactions.filter(
    (t) => t.buyerId === currentUser.id && t.status === "completed",
  );
  const totalSpend = myCompletedPurchases.reduce((s, t) => s + t.quantity * t.unitPrice, 0);

  const spendingOverTime = useMemo(() => {
    const sorted = [...myCompletedPurchases].sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
    let running = 0;
    return sorted.map((t) => {
      running += t.quantity * t.unitPrice;
      return { date: t.completedAt as string, cumulative: running };
    });
  }, [myCompletedPurchases]);

  const spendingByProduct = useMemo(() => {
    const totals = new Map<string, number>();
    myCompletedPurchases.forEach((t) => {
      const name = productById(t.productId)?.name ?? "Other";
      totals.set(name, (totals.get(name) ?? 0) + t.quantity * t.unitPrice);
    });
    return Array.from(totals.entries())
      .map(([product, spend]) => ({ product, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6);
  }, [myCompletedPurchases]);

  const spendingTrendConfig: ChartConfig = { cumulative: { label: "Cumulative spend (RWF)", color: "var(--chart-2)" } };
  const spendingByProductConfig: ChartConfig = { spend: { label: "Spend (RWF)", color: "var(--chart-3)" } };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingBasket} title="Open requests" value={open.length} tone="brand" />
        <StatCard icon={Handshake} title="Aggregation groups" value={groups.length} tone="soft" />
        <StatCard
          icon={CheckCircle2}
          title="Requests filled"
          value={myRequests.filter((r) => r.status === "filled").length}
          tone="success"
        />
        <StatCard
          icon={AlertTriangle}
          title="Ready to aggregate"
          value={needingAggregation.length}
          tone={needingAggregation.length ? "warning" : "success"}
          hint="Matching listings found"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Requests by status" subtitle="Where your buyer requests stand">
          {requestsByStatus.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Post your first request to see this chart.</p>
          ) : (
            <ChartContainer config={requestsChartConfig} className="mx-auto h-56 w-full max-w-xs p-4">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                <Pie data={requestsByStatus} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} strokeWidth={2}>
                  {requestsByStatus.map((row) => (
                    <Cell key={row.status} fill={REQUEST_STATUS_COLORS[row.status]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          )}
        </Panel>

        <Panel
          title="Spending over time"
          subtitle={totalSpend > 0 ? `${formatRwf(totalSpend)} spent so far` : "No completed purchases yet"}
        >
          {spendingOverTime.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Your cumulative spend will chart here once orders complete.
            </p>
          ) : (
            <ChartContainer config={spendingTrendConfig} className="h-56 w-full p-4">
              <AreaChart data={spendingOverTime}>
                <defs>
                  <linearGradient id="buyerSpendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} />
                <Area dataKey="cumulative" type="monotone" stroke="var(--chart-2)" fill="url(#buyerSpendFill)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </Panel>
      </div>

      {spendingByProduct.length > 0 && (
        <Panel title="Spending by product" subtitle="Where your purchase budget is going">
          <ChartContainer config={spendingByProductConfig} className="h-56 w-full p-4">
            <BarChart data={spendingByProduct}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="product" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} />
              <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="My requests"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/requests">All requests</Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {myRequests.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground">
                  You haven't posted any requests yet.
                </li>
              )}
              {myRequests.slice(0, 6).map((r) => {
                const product = productById(r.productId);
                const matches = matchingListingsForRequest(r.id).length;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {formatQuantity(r.quantityNeeded, r.unit)} {product?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Needed by {r.neededByDate} · {matches} matching listing{matches === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/requests/$requestId" params={{ requestId: r.id }}>
                        View
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Notifications">
          <div className="p-2">
            <NotificationFeed items={notifications} limit={6} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------------- Supplier -------------------------------- */

export function SupplierDashboard() {
  const {
    currentUser,
    myInputListings,
    groupPurchases,
    pledgedQuantityFor,
    transactions,
    notificationsForUser,
  } = useWorkspace();
  const myGroupPurchases = groupPurchases.filter((g) =>
    myInputListings.some((l) => l.id === g.inputListingId),
  );
  const collecting = myGroupPurchases.filter((g) => g.status === "collecting");
  const orders = transactions.filter((t) => t.sellerId === currentUser.id);
  const notifications = notificationsForUser(currentUser.id);

  const stockByInput = useMemo(
    () =>
      myInputListings
        .map((l) => ({ product: productById(l.productId)?.name ?? "Input", stock: l.stockQty }))
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 6),
    [myInputListings],
  );

  const completedOrders = orders.filter((t) => t.status === "completed");
  const totalRevenue = completedOrders.reduce((s, t) => s + t.quantity * t.unitPrice, 0);
  const revenueOverTime = useMemo(() => {
    const sorted = [...completedOrders].sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
    let running = 0;
    return sorted.map((t) => {
      running += t.quantity * t.unitPrice;
      return { date: t.completedAt as string, cumulative: running };
    });
  }, [completedOrders]);

  const groupPurchasesByStatus = useMemo(() => {
    const order: Array<(typeof myGroupPurchases)[number]["status"]> = ["collecting", "fulfilled", "expired"];
    const labels = { collecting: "Collecting", fulfilled: "Fulfilled", expired: "Expired" } as const;
    const colors = { collecting: "var(--chart-1)", fulfilled: "var(--success)", expired: "var(--muted-foreground)" } as const;
    return order
      .map((status) => ({
        status,
        label: labels[status],
        color: colors[status],
        count: myGroupPurchases.filter((g) => g.status === status).length,
      }))
      .filter((row) => row.count > 0);
  }, [myGroupPurchases]);
  const groupPurchasesChartConfig = useMemo(
    () =>
      Object.fromEntries(groupPurchasesByStatus.map((r) => [r.status, { label: r.label, color: r.color }])) as ChartConfig,
    [groupPurchasesByStatus],
  );

  const stockChartConfig: ChartConfig = { stock: { label: "Stock on hand", color: "var(--chart-1)" } };
  const revenueTrendConfig: ChartConfig = { cumulative: { label: "Cumulative revenue (RWF)", color: "var(--chart-3)" } };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} title="Active input listings" value={myInputListings.length} tone="brand" />
        <StatCard icon={Boxes} title="Group purchases open" value={collecting.length} tone="soft" />
        <StatCard
          icon={ShoppingCart}
          title="Orders received"
          value={orders.length}
          tone="success"
        />
        <StatCard
          icon={ShieldCheck}
          title="Reliability score"
          value={`${currentUser.reliabilityScore}/100`}
          tone="soft"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Stock by input" subtitle="What you currently have on hand">
          {stockByInput.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">List an input to see your stock chart.</p>
          ) : (
            <ChartContainer config={stockChartConfig} className="h-56 w-full p-4">
              <BarChart data={stockByInput}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="product" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="stock" fill="var(--color-stock)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </Panel>

        <Panel title="Group purchases by status" subtitle="Across all group orders on your inputs">
          {groupPurchasesByStatus.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No group purchases against your inputs yet.</p>
          ) : (
            <ChartContainer config={groupPurchasesChartConfig} className="mx-auto h-56 w-full max-w-xs p-4">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                <Pie data={groupPurchasesByStatus} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} strokeWidth={2}>
                  {groupPurchasesByStatus.map((row) => (
                    <Cell key={row.status} fill={row.color} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          )}
        </Panel>
      </div>

      {revenueOverTime.length > 0 && (
        <Panel
          title="Revenue over time"
          subtitle={totalRevenue > 0 ? `${formatRwf(totalRevenue)} earned from completed orders` : "No completed orders yet"}
        >
          <ChartContainer config={revenueTrendConfig} className="h-56 w-full p-4">
            <AreaChart data={revenueOverTime}>
              <defs>
                <linearGradient id="supplierRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} />
              <Area dataKey="cumulative" type="monotone" stroke="var(--chart-3)" fill="url(#supplierRevenueFill)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Group purchases against your inputs"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/group-purchases">All group purchases</Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {collecting.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground">No group purchases collecting right now.</li>
              )}
              {collecting.map((g) => {
                const listing = myInputListings.find((l) => l.id === g.inputListingId);
                const product = productById(listing?.productId);
                const pledged = pledgedQuantityFor(g.id);
                const pct = Math.min(100, Math.round((pledged / g.thresholdQuantity) * 100));
                return (
                  <li key={g.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatQuantity(pledged, listing?.unit ?? "kg")} of{" "}
                        {formatQuantity(g.thresholdQuantity, listing?.unit ?? "kg")} pledged
                      </p>
                    </div>
                    <div className="w-32">
                      <Progress value={pct} />
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/group-purchases/$groupPurchaseId" params={{ groupPurchaseId: g.id }}>
                        View
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Notifications">
          <div className="p-2">
            <NotificationFeed items={notifications} limit={6} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------- Admin ---------------------------------- */

const ROLE_ORDER: Role[] = ["farmer", "buyer", "supplier", "transporter", "admin"];
const TRANSACTION_STATUS_ORDER: TransactionStatus[] = [
  "pending",
  "confirmed_by_seller",
  "confirmed_by_buyer",
  "completed",
  "disputed",
];
const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  pending: "var(--muted-foreground)",
  confirmed_by_seller: "var(--chart-1)",
  confirmed_by_buyer: "var(--chart-2)",
  completed: "var(--success)",
  disputed: "var(--destructive)",
};

export function AdminDashboard() {
  const { users, transactions, notifications, verifyUser } = useWorkspace();
  const pendingVerification = users.filter((u) => !u.isVerified && u.roles.includes("supplier"));
  const disputed = transactions.filter((t) => t.status === "disputed");
  const completedTransactions = transactions.filter((t) => t.status === "completed");
  const gmv = completedTransactions.reduce((s, t) => s + t.quantity * t.unitPrice, 0);

  const usersByRole = useMemo(
    () =>
      ROLE_ORDER.map((role) => ({
        role,
        label: ROLE_LABELS[role],
        count: users.filter((u) => u.roles.includes(role)).length,
      })).filter((row) => row.count > 0),
    [users],
  );
  const usersChartConfig = useMemo(() => buildConfig(usersByRole.map((r) => r.role), ROLE_LABELS), [usersByRole]);

  const gmvOverTime = useMemo(() => {
    const sorted = [...completedTransactions].sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
    let running = 0;
    return sorted.map((t) => {
      running += t.quantity * t.unitPrice;
      return { date: t.completedAt as string, cumulative: running };
    });
  }, [completedTransactions]);
  const gmvTrendConfig: ChartConfig = { cumulative: { label: "Cumulative GMV (RWF)", color: "var(--chart-2)" } };

  const transactionsByStatus = useMemo(
    () =>
      TRANSACTION_STATUS_ORDER.map((status) => ({
        status,
        label: TRANSACTION_STATUS_LABELS[status],
        count: transactions.filter((t) => t.status === status).length,
      })).filter((row) => row.count > 0),
    [transactions],
  );
  const transactionsChartConfig = useMemo(
    () => buildConfig(transactionsByStatus.map((r) => r.status), TRANSACTION_STATUS_LABELS, TRANSACTION_STATUS_COLORS),
    [transactionsByStatus],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} title="Platform users" value={users.length} tone="brand" />
        <StatCard
          icon={ShieldCheck}
          title="Pending verifications"
          value={pendingVerification.length}
          tone={pendingVerification.length ? "warning" : "success"}
        />
        <StatCard
          icon={AlertTriangle}
          title="Open disputes"
          value={disputed.length}
          tone={disputed.length ? "danger" : "success"}
        />
        <StatCard icon={ShoppingCart} title="GMV completed" value={formatRwf(gmv)} tone="soft" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Users by role" subtitle="Who's on the platform">
          <ChartContainer config={usersChartConfig} className="mx-auto h-56 w-full max-w-xs p-4">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="role" />} />
              <Pie data={usersByRole} dataKey="count" nameKey="role" innerRadius={45} outerRadius={75} strokeWidth={2}>
                {usersByRole.map((row, i) => (
                  <Cell key={row.role} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="role" />} />
            </PieChart>
          </ChartContainer>
        </Panel>

        <Panel title="Transactions by status" subtitle="Every deal on the platform, by stage">
          <ChartContainer config={transactionsChartConfig} className="h-56 w-full p-4">
            <BarChart data={transactionsByStatus} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={4}>
                {transactionsByStatus.map((row) => (
                  <Cell key={row.status} fill={TRANSACTION_STATUS_COLORS[row.status]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </Panel>
      </div>

      {gmvOverTime.length > 0 && (
        <Panel title="GMV over time" subtitle={`${formatRwf(gmv)} in completed transactions so far`}>
          <ChartContainer config={gmvTrendConfig} className="h-56 w-full p-4">
            <AreaChart data={gmvOverTime}>
              <defs>
                <linearGradient id="adminGmvFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatRwf(Number(value))} />} />
              <Area dataKey="cumulative" type="monotone" stroke="var(--chart-2)" fill="url(#adminGmvFill)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Suppliers awaiting verification">
            <ul className="divide-y divide-border">
              {pendingVerification.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground">Nothing to review.</li>
              )}
              {pendingVerification.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                  </div>
                  <Button size="sm" onClick={() => verifyUser(u.id, true)}>
                    Verify
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Disputed transactions"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions">All transactions</Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {disputed.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground">No open disputes.</li>
              )}
              {disputed.map((t) => {
                const product = productById(t.productId);
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {formatQuantity(t.quantity, t.unit)} {product?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.disputeReason}</p>
                    </div>
                    <TransactionStatusBadge status={t.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/transactions/$transactionId" params={{ transactionId: t.id }}>
                        Resolve
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Platform activity">
          <div className="p-2">
            <NotificationFeed items={notifications} limit={8} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------- Transporter ------------------------------- */

const AGGREGATION_STATUS_COLORS = { confirmed: "var(--success)", partially_confirmed: "var(--warning)" } as const;

export function TransporterDashboard() {
  const {
    currentUser,
    aggregationGroups,
    buyerRequests,
    transportOffers,
    notificationsForUser,
  } = useWorkspace();
  const notifications = notificationsForUser(currentUser.id);

  const needingTransport = aggregationGroups.filter(
    (g) => g.status === "confirmed" || g.status === "partially_confirmed",
  );
  const myOffers = transportOffers.filter((o) => o.transporterId === currentUser.id);
  const totalCargo = needingTransport.reduce((s, g) => s + g.targetQuantity, 0);

  const cargoByProduct = useMemo(() => {
    const totals = new Map<string, number>();
    needingTransport.forEach((g) => {
      const request = buyerRequests.find((r) => r.id === g.requestId);
      const name = productById(request?.productId)?.name ?? "Other";
      totals.set(name, (totals.get(name) ?? 0) + g.targetQuantity);
    });
    return Array.from(totals.entries())
      .map(([product, quantity]) => ({ product, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [needingTransport, buyerRequests]);

  const groupsByStatus = useMemo(() => {
    const order: Array<"confirmed" | "partially_confirmed"> = ["confirmed", "partially_confirmed"];
    const labels = { confirmed: "Confirmed", partially_confirmed: "Partially confirmed" } as const;
    return order
      .map((status) => ({
        status,
        label: labels[status],
        count: needingTransport.filter((g) => g.status === status).length,
      }))
      .filter((row) => row.count > 0);
  }, [needingTransport]);
  const groupsChartConfig = useMemo(
    () => buildConfig(groupsByStatus.map((r) => r.status), { confirmed: "Confirmed", partially_confirmed: "Partially confirmed" }, AGGREGATION_STATUS_COLORS),
    [groupsByStatus],
  );

  const cargoChartConfig: ChartConfig = { quantity: { label: "Cargo (kg)", color: "var(--chart-1)" } };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Truck} title="Needs transport" value={needingTransport.length} tone="brand" />
        <StatCard icon={Handshake} title="Offers made" value={myOffers.length} tone="soft" />
        <StatCard icon={Boxes} title="Total cargo (kg)" value={totalCargo.toLocaleString()} tone="soft" />
        <StatCard
          icon={ShieldCheck}
          title="Reliability score"
          value={`${currentUser.reliabilityScore}/100`}
          tone="soft"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Cargo by product" subtitle="What's waiting to be picked up">
          {cargoByProduct.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No confirmed groups need transport right now.</p>
          ) : (
            <ChartContainer config={cargoChartConfig} className="h-56 w-full p-4">
              <BarChart data={cargoByProduct}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="product" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </Panel>

        <Panel title="Groups by status" subtitle="Confirmed vs. still filling out">
          {groupsByStatus.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nothing confirmed yet.</p>
          ) : (
            <ChartContainer config={groupsChartConfig} className="mx-auto h-56 w-full max-w-xs p-4">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                <Pie data={groupsByStatus} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} strokeWidth={2}>
                  {groupsByStatus.map((row) => (
                    <Cell key={row.status} fill={AGGREGATION_STATUS_COLORS[row.status]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Groups needing transport"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/transport-pool">Transport pooling</Link>
              </Button>
            }
          >
            <ul className="divide-y divide-border">
              {needingTransport.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground">Check back once a buyer's order is fully matched.</li>
              )}
              {needingTransport.slice(0, 6).map((g) => {
                const request = buyerRequests.find((r) => r.id === g.requestId);
                const product = productById(request?.productId);
                return (
                  <li key={g.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {product?.name} · {formatQuantity(g.targetQuantity, g.unit)}
                      </p>
                      <p className="text-xs text-muted-foreground">Deadline {g.deadline}</p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/transport-pool">View</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Notifications">
          <div className="p-2">
            <NotificationFeed items={notifications} limit={6} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
