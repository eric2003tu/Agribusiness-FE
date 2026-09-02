import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Handshake, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RequestStatusBadge, ListingStatusBadge, AggregationStatusBadge } from "@/components/status-badge";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { locationLabel, productById } from "@/lib/mock-data";

export const Route = createFileRoute("/requests/$requestId")({
  head: () => ({ meta: [{ title: "Request — Agribridge" }] }),
  component: RequestDetail,
});

function RequestDetail() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const {
    buyerRequests,
    userById,
    currentUser,
    matchingListingsForRequest,
    proposeAggregation,
    aggregationGroups,
    startThread,
    can,
  } = useWorkspace();
  const request = buyerRequests.find((r) => r.id === requestId);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");

  if (!request) {
    return (
      <AppShell title="Request not found">
        <p className="text-sm text-muted-foreground">This request no longer exists.</p>
      </AppShell>
    );
  }

  const product = productById(request.productId);
  const buyer = userById(request.buyerId);
  const isOwner = currentUser.id === request.buyerId;
  const matches = matchingListingsForRequest(request.id);
  const groups = aggregationGroups.filter((g) => g.requestId === request.id);

  return (
    <AppShell
      title={`${formatQuantity(request.quantityNeeded, request.unit)} of ${product?.name ?? ""}`}
      description={`Posted by ${buyer?.name ?? "unknown"} · delivery to ${locationLabel(request.deliveryLocationId)}`}
      actions={
        (isOwner || can("moderate")) && (
          <Button onClick={() => proposeAggregation(request.id)}>
            <Handshake className="size-4" /> Run aggregation matching
          </Button>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-start gap-5">
              <ProductIllustration productId={request.productId} className="h-28 w-28" />
              <div className="min-w-[16rem] flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{product?.name}</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatQuantity(request.quantityNeeded, request.unit)}
                    </p>
                  </div>
                  <RequestStatusBadge status={request.status} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Target price</dt>
                    <dd className="font-medium text-foreground">
                      {request.targetPrice ? `${formatRwf(request.targetPrice)}/${request.unit}` : "Open"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Needed by</dt>
                    <dd className="font-medium text-foreground">{request.neededByDate}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Delivery location</dt>
                    <dd className="font-medium text-foreground">{locationLabel(request.deliveryLocationId)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Posted</dt>
                    <dd className="font-medium text-foreground">{request.createdAt}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {groups.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Aggregation groups</h2>
              <ul className="mt-3 divide-y divide-border">
                {groups.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Target {formatQuantity(g.targetQuantity, g.unit)} at {formatRwf(g.unitPrice)}/
                        {g.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">Deadline {g.deadline}</p>
                    </div>
                    <AggregationStatusBadge status={g.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/aggregation/$groupId" params={{ groupId: g.id }}>
                        View
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Matching listings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ranked by same district first, then price, then seller reliability.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {matches.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No available listings match yet.</li>
              )}
              {matches.map((l) => {
                const seller = userById(l.sellerId);
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {formatQuantity(l.quantity, l.unit)} · {locationLabel(l.locationId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {seller?.name} · {l.unitPrice ? `${formatRwf(l.unitPrice)}/${l.unit}` : "Negotiable"}
                      </p>
                    </div>
                    <ReliabilityBadge score={seller?.reliabilityScore ?? 0} />
                    <ListingStatusBadge status={l.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/listings/$listingId" params={{ listingId: l.id }}>
                        View
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
                <p className="truncate text-sm font-medium text-foreground">{buyer?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{buyer?.phone}</p>
              </div>
            </div>
            <div className="mt-3">
              <ReliabilityBadge score={buyer?.reliabilityScore ?? 0} />
            </div>
            {!isOwner && (
              <Button className="mt-4 w-full" variant="outline" onClick={() => setMessageOpen((o) => !o)}>
                <MessageSquare className="size-4" /> Message buyer
              </Button>
            )}
            {messageOpen && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="I can supply part of this order..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!message.trim()}
                  onClick={() => {
                    startThread({
                      otherUserId: request.buyerId,
                      subject: `${product?.name} request ${request.id}`,
                      relatedRequestId: request.id,
                      firstMessage: message,
                    });
                    setMessage("");
                    setMessageOpen(false);
                    void navigate({ to: "/messages" });
                  }}
                >
                  Send
                </Button>
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Request summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Matching listings</dt>
                <dd className="font-medium text-foreground">{matches.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Aggregation groups</dt>
                <dd className="font-medium text-foreground">{groups.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd className="font-medium text-foreground">{request.unit}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
