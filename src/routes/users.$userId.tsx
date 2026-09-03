import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { ListingStatusBadge, TransactionStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity } from "@/lib/format";
import { ROLE_LABELS, locationLabel, productById } from "@/lib/mock-data";

export const Route = createFileRoute("/users/$userId")({
  head: () => ({ meta: [{ title: "User profile — Agribridge" }] }),
  component: UserDetail,
});

function UserDetail() {
  const { userId } = Route.useParams();
  const { users, produceListings, transactions, ratingsForUser, userById, cooperatives, verifyUser, setUserSuspended, can } =
    useWorkspace();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return (
      <AppShell title="User not found">
        <p className="text-sm text-muted-foreground">This user doesn't exist.</p>
      </AppShell>
    );
  }

  const listings = produceListings.filter((l) => l.sellerId === user.id);
  const userTransactions = transactions.filter((t) => t.buyerId === user.id || t.sellerId === user.id);
  const ratings = ratingsForUser(user.id);
  const cooperative = cooperatives.find((c) => c.id === user.cooperativeId);
  const averageRating =
    ratings.length > 0 ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1) : null;

  return (
    <AppShell title={user.name} description={user.phone}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} className="size-12 text-base" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-foreground">{user.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.roles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                  <Badge variant={user.status === "suspended" ? "destructive" : "outline"}>
                    {user.status === "suspended" ? "Suspended" : "Active"}
                  </Badge>
                </div>
              </div>
              <ReliabilityBadge score={user.reliabilityScore} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium text-foreground">{locationLabel(user.locationId)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cooperative</dt>
                <dd className="font-medium text-foreground">{cooperative?.name ?? "None"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium text-foreground">{user.createdAt}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Verified</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                  {user.isVerified ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  {user.isVerified ? "Yes" : "No"}
                </dd>
              </div>
            </dl>

            {can("moderate") && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button size="sm" variant="outline" onClick={() => verifyUser(user.id, !user.isVerified)}>
                  {user.isVerified ? "Unverify" : "Verify"}
                </Button>
                <Button
                  size="sm"
                  variant={user.status === "suspended" ? "outline" : "destructive"}
                  onClick={() => setUserSuspended(user.id, user.status !== "suspended")}
                >
                  {user.status === "suspended" ? "Reinstate" : "Suspend"}
                </Button>
              </div>
            )}
          </section>

          {listings.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Listings</h2>
              <ul className="mt-3 divide-y divide-border">
                {listings.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                    <ProductIllustration productId={l.productId} className="size-10" rounded="rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {productById(l.productId)?.name} — {formatQuantity(l.quantity, l.unit)}
                      </p>
                    </div>
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
          )}

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Transaction history</h2>
            <ul className="mt-3 divide-y divide-border">
              {userTransactions.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No transactions yet.</li>
              )}
              {userTransactions.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <ProductIllustration productId={t.productId} className="size-10" rounded="rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {productById(t.productId)?.name} — {formatQuantity(t.quantity, t.unit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.buyerId === user.id ? "As buyer" : "As seller"}
                    </p>
                  </div>
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
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Ratings received</h2>
            <ul className="mt-3 space-y-3">
              {ratings.length === 0 && <li className="text-sm text-muted-foreground">No ratings yet.</li>}
              {ratings.map((r) => {
                const reviewer = userById(r.ratedBy);
                return (
                  <li key={r.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={reviewer} className="size-6 text-[10px]" />
                      <p className="truncate text-xs font-medium text-foreground">{reviewer?.name ?? "Unknown"}</p>
                    </div>
                    <div className="mt-1.5 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-3.5 ${n <= r.score ? "fill-warning text-warning" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Profile summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Listings</dt>
                <dd className="font-medium text-foreground">{listings.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Transactions</dt>
                <dd className="font-medium text-foreground">{userTransactions.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Average rating</dt>
                <dd className="font-medium text-foreground">{averageRating ? `${averageRating} / 5` : "—"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
