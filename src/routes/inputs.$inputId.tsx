import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { GroupPurchaseStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { CategoryBadge } from "@/routes/inputs";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { locations, productById } from "@/lib/mock-data";

export const Route = createFileRoute("/inputs/$inputId")({
  head: () => ({ meta: [{ title: "Input listing — Agribridge" }] }),
  component: InputDetail,
});

function InputDetail() {
  const { inputId } = Route.useParams();
  const {
    inputListings,
    userById,
    addToCart,
    groupPurchases,
    pledgedQuantityFor,
    createGroupPurchase,
    hasRole,
  } = useWorkspace();
  const listing = inputListings.find((l) => l.id === inputId);
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("");

  if (!listing) {
    return (
      <AppShell title="Input not found">
        <p className="text-sm text-muted-foreground">This listing no longer exists.</p>
      </AppShell>
    );
  }

  const product = productById(listing.productId);
  const supplier = userById(listing.supplierId);
  const relatedGroupPurchases = groupPurchases.filter((g) => g.inputListingId === listing.id);

  return (
    <AppShell
      title={product?.name ?? "Input"}
      description={`Supplied by ${supplier?.name ?? "unknown"}`}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-start gap-5">
              {listing.photos && listing.photos.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto">
                  {listing.photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`${product?.name ?? "Input"} photo ${i + 1}`}
                      className="h-28 w-28 shrink-0 rounded-xl object-cover"
                    />
                  ))}
                </div>
              ) : (
                <ProductIllustration productId={listing.productId} className="h-28 w-28" />
              )}
              <div className="min-w-[16rem] flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{product?.name}</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatRwf(listing.price)}
                      <span className="text-base font-normal text-muted-foreground">/{listing.unit}</span>
                    </p>
                  </div>
                  <CategoryBadge input={listing} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">In stock</dt>
                    <dd className="font-medium text-foreground">
                      {formatQuantity(listing.stockQty, listing.unit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Listed</dt>
                    <dd className="font-medium text-foreground">{listing.createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Group purchases</dt>
                    <dd className="font-medium text-foreground">{relatedGroupPurchases.length}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-muted-foreground">Delivers to</dt>
                    <dd className="font-medium text-foreground">
                      {listing.deliveryDistrictIds
                        .map((id) => locations.find((l) => l.id === id)?.name)
                        .join(", ") || "Not specified"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {hasRole("farmer") && (
              <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="qty">Order quantity ({listing.unit})</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    className="w-40"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    const qty = Number(quantity);
                    if (qty > 0) {
                      addToCart("input", listing.id, qty);
                      setQuantity("");
                    }
                  }}
                >
                  Add to cart
                </Button>
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Group purchases</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Farmers pool orders to unlock a bulk discount from this supplier.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {relatedGroupPurchases.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No group purchase open yet.</li>
              )}
              {relatedGroupPurchases.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {formatQuantity(pledgedQuantityFor(g.id), listing.unit)} of{" "}
                      {formatQuantity(g.thresholdQuantity, listing.unit)} pledged
                    </p>
                    <p className="text-xs text-muted-foreground">Deadline {g.deadline}</p>
                  </div>
                  <GroupPurchaseStatusBadge status={g.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/group-purchases/$groupPurchaseId" params={{ groupPurchaseId: g.id }}>
                      View
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>

            {hasRole("farmer") && (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="threshold">Open a new group purchase — threshold ({listing.unit})</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={1}
                    className="w-40"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const qty = Number(threshold);
                    if (qty > 0) {
                      const deadline = new Date();
                      deadline.setDate(deadline.getDate() + 7);
                      createGroupPurchase({
                        inputListingId: listing.id,
                        thresholdQuantity: qty,
                        deadline: deadline.toISOString().slice(0, 10),
                      });
                      setThreshold("");
                    }
                  }}
                >
                  Open group purchase
                </Button>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Supplier</h2>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar user={supplier} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{supplier?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{supplier?.phone}</p>
              </div>
            </div>
            <div className="mt-3">
              <ReliabilityBadge score={supplier?.reliabilityScore ?? 0} />
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Listing summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Delivery districts</dt>
                <dd className="font-medium text-foreground">{listing.deliveryDistrictIds.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Open group purchases</dt>
                <dd className="font-medium text-foreground">
                  {relatedGroupPurchases.filter((g) => g.status === "collecting").length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd className="font-medium text-foreground">{listing.unit}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
