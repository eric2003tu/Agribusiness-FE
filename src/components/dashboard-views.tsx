import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
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
  Users,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ListingStatusBadge, TransactionStatusBadge } from "@/components/status-badge";
import { NotificationFeed } from "@/components/notification-feed";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf, formatQuantity } from "@/lib/format";
import { productById, locationLabel } from "@/lib/mock-data";

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

export function FarmerDashboard() {
  const { currentUser, myListings, aggregationParticipants, produceListings, notificationsForUser, respondToAggregation } =
    useWorkspace();
  const active = myListings.filter((l) => l.status === "available" || l.status === "reserved");
  const myPending = aggregationParticipants.filter(
    (p) => p.farmerId === currentUser.id && p.status === "pending",
  );
  const notifications = notificationsForUser(currentUser.id);

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
                <Link to="/listings">All listings</Link>
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

export function BuyerDashboard() {
  const { currentUser, myRequests, groupsForUser, matchingListingsForRequest, notificationsForUser } =
    useWorkspace();
  const open = myRequests.filter((r) => r.status === "open" || r.status === "partially_filled");
  const groups = groupsForUser(currentUser.id);
  const needingAggregation = open.filter((r) => matchingListingsForRequest(r.id).length > 0);
  const notifications = notificationsForUser(currentUser.id);

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
  const { currentUser, myInputListings, groupPurchases, pledgedQuantityFor, transactions, notificationsForUser } =
    useWorkspace();
  const collecting = groupPurchases.filter((g) => {
    const listing = myInputListings.find((l) => l.id === g.inputListingId);
    return listing && g.status === "collecting";
  });
  const orders = transactions.filter((t) => t.sellerId === currentUser.id);
  const notifications = notificationsForUser(currentUser.id);

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

export function AdminDashboard() {
  const { users, transactions, notifications, verifyUser } = useWorkspace();
  const pendingVerification = users.filter((u) => !u.isVerified && u.roles.includes("supplier"));
  const disputed = transactions.filter((t) => t.status === "disputed");
  const gmv = transactions
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + t.quantity * t.unitPrice, 0);

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
