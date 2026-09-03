import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Layers, ShoppingCart, Sprout, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { ListingStatusBadge, TransactionStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import {
  ORGANIZATION_TYPE_LABELS,
  ROLE_LABELS,
  locationById,
  locationLabel,
  primaryRole,
  productById,
} from "@/lib/mock-data";

export const Route = createFileRoute("/cooperatives/$cooperativeId")({
  head: () => ({ meta: [{ title: "Cooperative — Agribridge" }] }),
  component: CooperativeDetail,
});

function CooperativeDetail() {
  const { cooperativeId } = Route.useParams();
  const { cooperatives, users, endorsements, userById, produceListings, transactions } = useWorkspace();
  const coop = cooperatives.find((c) => c.id === cooperativeId);

  if (!coop) {
    return (
      <AppShell allowedRoles={["admin"]} title="Cooperative not found">
        <p className="text-sm text-muted-foreground">This cooperative doesn't exist.</p>
      </AppShell>
    );
  }

  const members = users.filter((u) => u.cooperativeId === coop.id);
  const memberIds = new Set(members.map((m) => m.id));
  const verifiedCount = members.filter((u) => u.isVerified).length;
  const avgReliability =
    members.length > 0
      ? Math.round(members.reduce((s, u) => s + u.reliabilityScore, 0) / members.length)
      : 0;

  const memberListings = produceListings
    .filter((l) => memberIds.has(l.sellerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeListings = memberListings.filter((l) => l.status === "available");
  const distinctProducts = new Set(memberListings.map((l) => l.productId));

  const memberSales = transactions
    .filter((t) => memberIds.has(t.sellerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const completedSales = memberSales.filter((t) => t.status === "completed");
  const totalRevenue = completedSales.reduce((s, t) => s + t.quantity * t.unitPrice, 0);

  const relatedEndorsements = endorsements.filter(
    (e) => memberIds.has(e.endorserId) || memberIds.has(e.endorsedId),
  );

  return (
    <AppShell
      allowedRoles={["admin"]}
      title={coop.name}
      description={`${locationById(coop.districtId)?.name ?? "Unknown district"} · ${coop.registrationNumber}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Sprout} title="Active listings" value={activeListings.length} tone="brand" />
        <StatCard icon={ShoppingCart} title="Completed sales" value={completedSales.length} tone="success" />
        <StatCard icon={Wallet} title="Total revenue" value={formatRwf(totalRevenue)} tone="soft" />
        <StatCard icon={Layers} title="Products grown" value={distinctProducts.size} tone="warning" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="listings">Listings ({memberListings.length})</TabsTrigger>
          <TabsTrigger value="sales">Sales ({memberSales.length})</TabsTrigger>
          <TabsTrigger value="endorsements">Endorsements ({relatedEndorsements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="surface-card p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{coop.name}</p>
                  <p className="text-xs text-muted-foreground">{coop.registrationNumber}</p>
                </div>
                <Badge variant="secondary">{ORGANIZATION_TYPE_LABELS[coop.organizationType]}</Badge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">District</dt>
                  <dd className="font-medium text-foreground">{locationById(coop.districtId)?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Members</dt>
                  <dd className="font-medium text-foreground">{members.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Avg. reliability</dt>
                  <dd className="font-medium text-foreground">{avgReliability}</dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Products grown
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {distinctProducts.size === 0 && (
                    <p className="text-sm text-muted-foreground">No listings yet.</p>
                  )}
                  {[...distinctProducts].map((id) => (
                    <Badge key={id} variant="secondary">
                      {productById(id)?.name ?? id}
                    </Badge>
                  ))}
                </div>
              </div>
            </section>

            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Cooperative summary</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Total members</dt>
                  <dd className="font-medium text-foreground">{members.length}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">ID-verified members</dt>
                  <dd className="font-medium text-foreground">
                    {verifiedCount}/{members.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Endorsements</dt>
                  <dd className="font-medium text-foreground">{relatedEndorsements.length}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium text-foreground">{ORGANIZATION_TYPE_LABELS[coop.organizationType]}</dd>
                </div>
              </dl>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <section className="surface-card p-5">
            <ul className="divide-y divide-border">
              {members.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No members yet.</li>
              )}
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  <UserAvatar user={m} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.phone}</p>
                  </div>
                  <Badge variant="secondary">{ROLE_LABELS[primaryRole(m)]}</Badge>
                  <ReliabilityBadge score={m.reliabilityScore} />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {m.isVerified ? (
                      <CheckCircle2 className="size-3.5 text-success" />
                    ) : (
                      <Circle className="size-3.5" />
                    )}
                    {m.isVerified ? "ID verified" : "Not ID verified"}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/users/$userId" params={{ userId: m.id }}>
                      View
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="listings">
          <section className="surface-card p-5">
            <p className="text-xs text-muted-foreground">Every listing currently posted by a member.</p>
            <ul className="mt-3 divide-y divide-border">
              {memberListings.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No listings from members yet.</li>
              )}
              {memberListings.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                  <ProductIllustration productId={l.productId} className="size-10" rounded="rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {productById(l.productId)?.name} — {formatQuantity(l.quantity, l.unit)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {userById(l.sellerId)?.name} · {locationLabel(l.locationId)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {l.unitPrice ? `${formatRwf(l.unitPrice)}/${l.unit}` : "Negotiable"}
                  </span>
                  <ListingStatusBadge status={l.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/listings/$listingId" params={{ listingId: l.id }}>
                      View
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="sales">
          <section className="surface-card p-5">
            <p className="text-xs text-muted-foreground">Transactions where a member was the seller.</p>
            <ul className="mt-3 divide-y divide-border">
              {memberSales.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No sales yet.</li>
              )}
              {memberSales.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <ProductIllustration productId={t.productId} className="size-10" rounded="rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {productById(t.productId)?.name} — {formatQuantity(t.quantity, t.unit)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {userById(t.sellerId)?.name} sold to {userById(t.buyerId)?.name} · {t.createdAt}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatRwf(t.quantity * t.unitPrice)}</span>
                  <TransactionStatusBadge status={t.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/transactions/$transactionId" params={{ transactionId: t.id }}>
                      View
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="endorsements">
          <section className="surface-card p-5">
            <p className="text-xs text-muted-foreground">
              Cooperative leaders vouching for new farmers to solve the cold-start trust problem.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {relatedEndorsements.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No endorsements involving this cooperative yet.</li>
              )}
              {relatedEndorsements.map((e) => (
                <li key={e.id} className="py-3 text-sm">
                  <span className="font-medium text-foreground">{userById(e.endorserId)?.name}</span>{" "}
                  vouched for{" "}
                  <span className="font-medium text-foreground">{userById(e.endorsedId)?.name}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
