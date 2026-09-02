import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { AggregationStatusBadge, ParticipantStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { AppShell } from "@/components/app-shell";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { locationLabel, productById } from "@/lib/mock-data";

export const Route = createFileRoute("/aggregation/$groupId")({
  head: () => ({ meta: [{ title: "Aggregation group — Agribridge" }] }),
  component: AggregationDetail,
});

function AggregationDetail() {
  const { groupId } = Route.useParams();
  const {
    aggregationGroups,
    buyerRequests,
    participantsForGroup,
    userById,
    currentUser,
    respondToAggregation,
    confirmAggregationGroup,
    topUpAggregationGroup,
    can,
  } = useWorkspace();
  const group = aggregationGroups.find((g) => g.id === groupId);

  if (!group) {
    return (
      <AppShell title="Aggregation group not found">
        <p className="text-sm text-muted-foreground">This group no longer exists.</p>
      </AppShell>
    );
  }

  const request = buyerRequests.find((r) => r.id === group.requestId);
  const product = productById(request?.productId);
  const buyer = userById(request?.buyerId);
  const participants = participantsForGroup(group.id);
  const accepted = participants.filter((p) => p.status === "accepted");
  const pending = participants.filter((p) => p.status === "pending");
  const declined = participants.filter((p) => p.status === "declined");
  const confirmedQuantity = accepted.reduce((s, p) => s + p.allocatedQuantity, 0);
  const pct = Math.min(100, Math.round((confirmedQuantity / group.targetQuantity) * 100));
  const isBuyer = currentUser.id === request?.buyerId;
  const canConfirm = (isBuyer || can("moderate")) && group.status !== "confirmed";

  return (
    <AppShell
      title={`Aggregation for ${product?.name ?? "request"}`}
      description={`Buyer: ${buyer?.name ?? "unknown"} · deadline ${group.deadline}`}
      actions={
        canConfirm ? (
          <>
            {confirmedQuantity < group.targetQuantity && (
              <Button variant="outline" onClick={() => topUpAggregationGroup(group.id)}>
                Find more farmers for the shortfall
              </Button>
            )}
            {accepted.length > 0 && (
              <Button onClick={() => confirmAggregationGroup(group.id)}>Confirm group</Button>
            )}
          </>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-start gap-5">
              <ProductIllustration productId={request?.productId} className="h-28 w-28" />
              <div className="min-w-[16rem] flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {group.type === "sale" ? "Bulk produce sale" : "Group input purchase"}
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatQuantity(confirmedQuantity, group.unit)}{" "}
                      <span className="text-base font-normal text-muted-foreground">
                        of {formatQuantity(group.targetQuantity, group.unit)}
                      </span>
                    </p>
                  </div>
                  <AggregationStatusBadge status={group.status} />
                </div>
                <Progress value={pct} className="mt-4" />
                <p className="mt-1 text-xs text-muted-foreground">{pct}% confirmed</p>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Agreed price</dt>
                    <dd className="font-medium text-foreground">
                      {formatRwf(group.unitPrice)}/{group.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deadline</dt>
                    <dd className="font-medium text-foreground">{group.deadline}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Delivery location</dt>
                    <dd className="font-medium text-foreground">
                      {request ? locationLabel(request.deliveryLocationId) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Formed</dt>
                    <dd className="font-medium text-foreground">{group.createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Farmers</dt>
                    <dd className="font-medium text-foreground">{participants.length}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Original request</dt>
                    <dd className="font-medium text-foreground">
                      {request ? (
                        <Link
                          to="/requests/$requestId"
                          params={{ requestId: request.id }}
                          className="text-primary hover:underline"
                        >
                          {request.id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Farmers in this group</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each farmer confirms their own share before the group can be marked complete.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {participants.map((p) => {
                const farmer = userById(p.farmerId);
                const isMe = p.farmerId === currentUser.id;
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                    <UserAvatar user={farmer} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{farmer?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatQuantity(p.allocatedQuantity, group.unit)} at{" "}
                        {formatRwf(p.agreedUnitPrice)}/{group.unit}
                      </p>
                    </div>
                    <ReliabilityBadge score={farmer?.reliabilityScore ?? 0} />
                    <ParticipantStatusBadge status={p.status} />
                    {isMe && p.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => respondToAggregation(p.id, false)}>
                          Decline
                        </Button>
                        <Button size="sm" onClick={() => respondToAggregation(p.id, true)}>
                          Accept
                        </Button>
                      </div>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link to="/listings/$listingId" params={{ listingId: p.listingId }}>
                        View listing
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Buyer</h2>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar user={buyer} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{buyer?.name ?? "Unknown"}</p>
                <p className="truncate text-xs text-muted-foreground">{buyer?.phone}</p>
              </div>
            </div>
            <div className="mt-3">
              <ReliabilityBadge score={buyer?.reliabilityScore ?? 0} />
            </div>
            {request && (
              <Button asChild className="mt-4 w-full" variant="outline">
                <Link to="/requests/$requestId" params={{ requestId: request.id }}>
                  View original request
                </Link>
              </Button>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Group summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Accepted</dt>
                <dd className="font-medium text-foreground">{accepted.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Pending</dt>
                <dd className="font-medium text-foreground">{pending.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Declined</dt>
                <dd className="font-medium text-foreground">{declined.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Shortfall</dt>
                <dd className="font-medium text-foreground">
                  {formatQuantity(Math.max(0, group.targetQuantity - confirmedQuantity), group.unit)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
