import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { AggregationStatusBadge, ParticipantStatusBadge } from "@/components/status-badge";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { productById } from "@/lib/mock-data";

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
  const confirmedQuantity = accepted.reduce((s, p) => s + p.allocatedQuantity, 0);
  const pct = Math.min(100, Math.round((confirmedQuantity / group.targetQuantity) * 100));
  const isBuyer = currentUser.id === request?.buyerId;
  const canConfirm = (isBuyer || can("moderate")) && group.status !== "confirmed";

  return (
    <AppShell
      title={`Aggregation for ${product?.name ?? "request"}`}
      description={`Buyer: ${buyer?.name ?? "unknown"} · deadline ${group.deadline}`}
      actions={
        canConfirm && accepted.length > 0 ? (
          <Button onClick={() => confirmAggregationGroup(group.id)}>Confirm group</Button>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {formatQuantity(confirmedQuantity, group.unit)} of{" "}
                {formatQuantity(group.targetQuantity, group.unit)} confirmed
              </p>
              <AggregationStatusBadge status={group.status} />
            </div>
            <Progress value={pct} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              Agreed unit price {formatRwf(group.unitPrice)}/{group.unit}
            </p>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Farmers in this group</h2>
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
                        Allocated {formatQuantity(p.allocatedQuantity, group.unit)}
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
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
