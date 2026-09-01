import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/photo-uploader";
import { ListingStatusBadge, RequestStatusBadge } from "@/components/status-badge";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { UserAvatar } from "@/components/user-avatar";
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
    buyListing,
    can,
  } = useWorkspace();
  const listing = produceListings.find((l) => l.id === listingId);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editNegotiable, setEditNegotiable] = useState(false);
  const [editHarvestDate, setEditHarvestDate] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [buyQuantity, setBuyQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState(() => (listing?.unitPrice ? String(listing.unitPrice) : ""));

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
  const canBuy = !isOwner && listing.status === "available";
  const matches = matchingRequestsForListing(listing.id);

  function openEdit() {
    setEditQuantity(String(listing!.quantity));
    setEditPrice(listing!.unitPrice ? String(listing!.unitPrice) : "");
    setEditNegotiable(listing!.negotiable);
    setEditHarvestDate(listing!.harvestDate);
    setEditGrade(listing!.qualityGrade ?? "");
    setEditPhotos(listing!.photos ?? []);
    setEditOpen(true);
  }

  return (
    <AppShell
      title={product?.name ?? "Listing"}
      description={`Listed by ${seller?.name ?? "unknown"} · ${locationLabel(listing.locationId)}`}
      actions={
        canManage ? (
          <>
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            {listing.photos && listing.photos.length > 0 && (
              <div className="mb-5 flex gap-2 overflow-x-auto">
                {listing.photos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${product?.name ?? "Listing"} photo ${i + 1}`}
                    className="h-32 w-32 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
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
                  {listing.unitPrice
                    ? `${formatRwf(listing.unitPrice)}/${listing.unit}${listing.negotiable ? " (negotiable)" : ""}`
                    : "Negotiable — no asking price set"}
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

            {editOpen && (
              <div className="mt-5 space-y-4 border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editQuantity">Quantity ({listing.unit})</Label>
                    <Input
                      id="editQuantity"
                      type="number"
                      min={1}
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editGrade">Quality grade</Label>
                    <Input id="editGrade" value={editGrade} onChange={(e) => setEditGrade(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <p className="text-sm text-foreground">Negotiable price</p>
                  <Switch checked={editNegotiable} onCheckedChange={setEditNegotiable} />
                </div>
                {!editNegotiable && (
                  <div className="grid gap-2">
                    <Label htmlFor="editPrice">Unit price (RWF)</Label>
                    <Input
                      id="editPrice"
                      type="number"
                      min={0}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="editHarvest">Harvest date</Label>
                  <Input
                    id="editHarvest"
                    type="date"
                    value={editHarvestDate}
                    onChange={(e) => setEditHarvestDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Photos</Label>
                  <PhotoUploader photos={editPhotos} onChange={setEditPhotos} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const qty = Number(editQuantity);
                      if (!qty || qty <= 0) return;
                      updateListing(listing.id, {
                        quantity: qty,
                        negotiable: editNegotiable,
                        unitPrice: editNegotiable ? null : Number(editPrice) || null,
                        harvestDate: editHarvestDate,
                        photos: editPhotos,
                        ...(editGrade ? { qualityGrade: editGrade } : {}),
                      });
                      setEditOpen(false);
                    }}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            )}

            {canManage && !editOpen && (
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

            {canBuy && (
              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">Buy this listing</h3>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="buyQty">Quantity ({listing.unit})</Label>
                    <Input
                      id="buyQty"
                      type="number"
                      min={1}
                      max={listing.quantity}
                      className="w-32"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value)}
                    />
                  </div>
                  {listing.negotiable && (
                    <div className="grid gap-2">
                      <Label htmlFor="buyPrice">Your offer (RWF/{listing.unit})</Label>
                      <Input
                        id="buyPrice"
                        type="number"
                        min={0}
                        className="w-32"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                      />
                      {listing.unitPrice && (
                        <p className="text-xs text-muted-foreground">Asking {formatRwf(listing.unitPrice)}/{listing.unit}</p>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      const qty = Number(buyQuantity);
                      if (qty <= 0) return;
                      const ok = buyListing(
                        listing.id,
                        qty,
                        listing.negotiable ? Number(buyPrice) : undefined,
                      );
                      if (ok) {
                        setBuyQuantity("");
                        setBuyPrice("");
                        void navigate({ to: "/transactions" });
                      }
                    }}
                  >
                    <ShoppingCart className="size-4" /> Buy now
                  </Button>
                </div>
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
