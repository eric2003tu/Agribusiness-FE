import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingStatusBadge } from "@/components/status-badge";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { UserAvatar } from "@/components/user-avatar";
import { RequestStatusBadge } from "@/components/status-badge";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { locationLabel, productById, type ListingStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/listings/$listingId")({
  head: () => ({ meta: [{ title: "Listing — Agribridge" }] }),
  component: ListingDetail,
});

function ListingDetail() {
  const { listingId } = Route.useParams();
  const navigate = useNavigate();
  const {
    produceListings,
    userById,
    currentUser,
    updateListing,
    deleteListing,
    renewListing,
    matchingRequestsForListing,
    startThread,
    can,
  } = useWorkspace();
  const listing = produceListings.find((l) => l.id === listingId);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!listing) {
    return (
      <AppShell title="Listing not found">
        <p className="text-sm text-muted-foreground">This listing no longer exists.</p>
      </AppShell>
    );
  }

  const product = productById(listing.productId);
  const seller = userById(listing.sellerId);
  const isOwner = currentUser.id === listing.sellerId;
  const canManage = isOwner || can("moderate");
  const matches = matchingRequestsForListing(listing.id);

  return (
    <AppShell
      title={product?.name ?? "Listing"}
      description={`Listed by ${seller?.name ?? "unknown"} · ${locationLabel(listing.locationId)}`}
      actions={
        canManage ? (
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatQuantity(listing.quantity, listing.unit)}
                </p>
              </div>
              <ListingStatusBadge status={listing.status} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium text-foreground">
                  {listing.unitPrice ? `${formatRwf(listing.unitPrice)}/${listing.unit}` : "Negotiable"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Scope</dt>
                <dd className="font-medium text-foreground">
                  {listing.listingScope === "peer" ? "Peer-to-peer" : "Commercial"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Harvest date</dt>
                <dd className="font-medium text-foreground">{listing.harvestDate}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quality grade</dt>
                <dd className="font-medium text-foreground">{listing.qualityGrade ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="font-medium text-foreground">{listing.expiresAt}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium text-foreground">{locationLabel(listing.locationId)}</dd>
              </div>
            </dl>

            {canManage && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <Label className="text-xs text-muted-foreground">Update status</Label>
                <Select
                  value={listing.status}
                  onValueChange={(v) => updateListing(listing.id, { status: v as ListingStatus })}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                {listing.status === "expired" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      renewListing(listing.id, d.toISOString().slice(0, 10));
                    }}
                  >
                    Renew 30 days
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Matching buyer requests</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Open requests for {product?.name} that this listing could fulfil.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {matches.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No matching requests right now.</li>
              )}
              {matches.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatQuantity(r.quantityNeeded, r.unit)} needed by {r.neededByDate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userById(r.buyerId)?.name} · {locationLabel(r.deliveryLocationId)}
                    </p>
                  </div>
                  <RequestStatusBadge status={r.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/requests/$requestId" params={{ requestId: r.id }}>
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
            <h2 className="text-sm font-semibold text-foreground">Seller</h2>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar user={seller} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{seller?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{seller?.phone}</p>
              </div>
            </div>
            <div className="mt-3">
              <ReliabilityBadge score={seller?.reliabilityScore ?? 0} />
            </div>
            {!isOwner && (
              <Button className="mt-4 w-full" variant="outline" onClick={() => setMessageOpen((o) => !o)}>
                <MessageSquare className="size-4" /> Message seller
              </Button>
            )}
            {messageOpen && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Is this still available?"
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
                      otherUserId: listing.sellerId,
                      subject: `${product?.name} listing ${listing.id}`,
                      relatedListingId: listing.id,
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
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this listing?"
        description="This can't be undone. Buyers will no longer see it in search."
        onConfirm={() => {
          deleteListing(listing.id);
          void navigate({ to: "/listings" });
        }}
      />
    </AppShell>
  );
}
