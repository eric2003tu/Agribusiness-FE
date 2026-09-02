import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/stat-card";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity } from "@/lib/format";
import { locationLabel, productById } from "@/lib/mock-data";

export const Route = createFileRoute("/transport-pool")({
  head: () => ({
    meta: [
      { title: "Transport pooling — Agribridge" },
      {
        name: "description",
        content:
          "Confirmed aggregation groups clustered by pickup location — offer to carry a shared load.",
      },
    ],
  }),
  component: TransportPoolPage,
});

function TransportPoolPage() {
  const {
    aggregationGroups,
    buyerRequests,
    participantsForGroup,
    produceListings,
    userById,
    currentUser,
    offersForGroup,
    offerTransport,
  } = useWorkspace();
  const [noteByGroup, setNoteByGroup] = useState<Record<string, string>>({});

  const confirmedGroups = aggregationGroups.filter(
    (g) => g.status === "confirmed" || g.status === "partially_confirmed",
  );

  return (
    <AppShell
      allowedRoles={["transporter", "admin"]}
      title="Transport pooling"
      description="Once an aggregation group is confirmed, its farmers are already geographically clustered — offer to carry the shared load instead of each arranging separate transport."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Truck} title="Needs transport" value={confirmedGroups.length} tone="brand" />
      </div>

      <div className="space-y-4">
        {confirmedGroups.length === 0 && (
          <p className="surface-card p-10 text-center text-sm text-muted-foreground">
            No confirmed aggregation groups yet — check back once a buyer's order is fully matched.
          </p>
        )}
        {confirmedGroups.map((g) => {
          const request = buyerRequests.find((r) => r.id === g.requestId);
          const buyer = userById(request?.buyerId);
          const accepted = participantsForGroup(g.id).filter((p) => p.status === "accepted");
          // Simple nearest-neighbor-style ordering by district name — no need
          // for full vehicle-routing optimization at this scale (§8.7).
          const stops = [...accepted].sort((a, b) => {
            const la = produceListings.find((l) => l.id === a.listingId)?.locationId ?? "";
            const lb = produceListings.find((l) => l.id === b.listingId)?.locationId ?? "";
            return locationLabel(la).localeCompare(locationLabel(lb));
          });
          const offers = offersForGroup(g.id);
          const alreadyOffered = offers.some((o) => o.transporterId === currentUser.id);

          return (
            <section key={g.id} className="surface-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {productById(request?.productId)?.name} — {formatQuantity(g.targetQuantity, g.unit)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Delivering to {buyer?.name} · {locationLabel(request?.deliveryLocationId)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{stops.length} pickup stop(s)</span>
              </div>

              <ol className="mt-4 space-y-2">
                {stops.map((p, i) => {
                  const farmer = userById(p.farmerId);
                  const listing = produceListings.find((l) => l.id === p.listingId);
                  return (
                    <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <UserAvatar user={farmer} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{farmer?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {locationLabel(listing?.locationId)} · {formatQuantity(p.allocatedQuantity, g.unit)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {offers.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Transporters interested</p>
                  <ul className="mt-2 space-y-1">
                    {offers.map((o) => (
                      <li key={o.id} className="text-sm text-foreground">
                        {userById(o.transporterId)?.name}
                        {o.note && <span className="text-muted-foreground"> — {o.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <Textarea
                  placeholder="Optional note (vehicle size, availability window…)"
                  className="min-w-[16rem] flex-1"
                  rows={1}
                  value={noteByGroup[g.id] ?? ""}
                  onChange={(e) => setNoteByGroup((prev) => ({ ...prev, [g.id]: e.target.value }))}
                  disabled={alreadyOffered}
                />
                <Button
                  disabled={alreadyOffered}
                  onClick={() => offerTransport(g.id, noteByGroup[g.id]?.trim() || undefined)}
                >
                  {alreadyOffered ? "Offer sent" : "Offer to transport"}
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
