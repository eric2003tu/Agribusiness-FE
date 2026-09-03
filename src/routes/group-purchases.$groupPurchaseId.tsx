import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { GroupPurchaseStatusBadge } from "@/components/status-badge";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { locationLabel, productById } from "@/lib/mock-data";

export const Route = createFileRoute("/group-purchases/$groupPurchaseId")({
  head: () => ({ meta: [{ title: "Group purchase — Agribridge" }] }),
  component: GroupPurchaseDetail,
});

function GroupPurchaseDetail() {
  const { groupPurchaseId } = Route.useParams();
  const {
    groupPurchases,
    inputListings,
    userById,
    currentUser,
    pledgesForGroupPurchase,
    pledgedQuantityFor,
    pledgeToGroupPurchase,
    fulfillGroupPurchase,
    hasRole,
    can,
  } = useWorkspace();
  const groupPurchase = groupPurchases.find((g) => g.id === groupPurchaseId);
  const [pledgeQty, setPledgeQty] = useState("");

  if (!groupPurchase) {
    return (
      <AppShell title="Group purchase not found">
        <p className="text-sm text-muted-foreground">This group purchase no longer exists.</p>
      </AppShell>
    );
  }

  const inputListing = inputListings.find((l) => l.id === groupPurchase.inputListingId);
  const product = productById(inputListing?.productId);
  const supplier = userById(inputListing?.supplierId);
  const pledges = pledgesForGroupPurchase(groupPurchase.id);
  const pledged = pledgedQuantityFor(groupPurchase.id);
  const pct = Math.min(100, Math.round((pledged / groupPurchase.thresholdQuantity) * 100));
  const isSupplier = currentUser.id === inputListing?.supplierId;
  const unit = inputListing?.unit ?? "kg";

  return (
    <AppShell
      title={`Group purchase — ${product?.name ?? ""}`}
      description={`Supplied by ${supplier?.name ?? "unknown"} · deadline ${groupPurchase.deadline}`}
      actions={
        (isSupplier || can("moderate")) && groupPurchase.status === "collecting" ? (
          <Button onClick={() => fulfillGroupPurchase(groupPurchase.id)}>Place order with supplier</Button>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-start gap-5">
              <ProductIllustration productId={inputListing?.productId} className="h-28 w-28" />
              <div className="min-w-[16rem] flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{product?.name}</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatQuantity(pledged, unit)}{" "}
                      <span className="text-base font-normal text-muted-foreground">
                        of {formatQuantity(groupPurchase.thresholdQuantity, unit)}
                      </span>
                    </p>
                  </div>
                  <GroupPurchaseStatusBadge status={groupPurchase.status} />
                </div>
                <Progress value={pct} className="mt-4" />
                <p className="mt-1 text-xs text-muted-foreground">{pct}% pledged</p>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">List price</dt>
                    <dd className="font-medium text-foreground">
                      {inputListing ? `${formatRwf(inputListing.price)}/${unit}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deadline</dt>
                    <dd className="font-medium text-foreground">{groupPurchase.deadline}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Delivers to</dt>
                    <dd className="font-medium text-foreground">
                      {inputListing && inputListing.deliveryDistrictIds.length > 0
                        ? inputListing.deliveryDistrictIds.map((id) => locationLabel(id)).join(", ")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Formed</dt>
                    <dd className="font-medium text-foreground">{groupPurchase.createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Farmers pledged</dt>
                    <dd className="font-medium text-foreground">{pledges.length}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Invoice total</dt>
                    <dd className="font-medium text-foreground">
                      {groupPurchase.supplierInvoiceTotal ? formatRwf(groupPurchase.supplierInvoiceTotal) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {hasRole("farmer") && groupPurchase.status === "collecting" && (
              <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="pledge">Pledge quantity ({unit})</Label>
                  <Input
                    id="pledge"
                    type="number"
                    min={1}
                    className="w-40"
                    value={pledgeQty}
                    onChange={(e) => setPledgeQty(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    const qty = Number(pledgeQty);
                    if (qty > 0) {
                      pledgeToGroupPurchase(groupPurchase.id, qty);
                      setPledgeQty("");
                    }
                  }}
                >
                  Pledge
                </Button>
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Farmers pledged</h2>
            <ul className="mt-3 divide-y divide-border">
              {pledges.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No pledges yet.</li>
              )}
              {pledges.map((p) => {
                const farmer = userById(p.farmerId);
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                    <UserAvatar user={farmer} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{farmer?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pledged {formatQuantity(p.pledgedQuantity, unit)}
                      </p>
                    </div>
                    <ReliabilityBadge score={farmer?.reliabilityScore ?? 0} />
                    {p.computedShareAmount != null && (
                      <span className="text-sm font-medium text-foreground">
                        {formatRwf(p.computedShareAmount)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Supplier</h2>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar user={supplier} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{supplier?.name ?? "Unknown"}</p>
                <p className="truncate text-xs text-muted-foreground">{supplier?.phone}</p>
              </div>
            </div>
            <div className="mt-3">
              <ReliabilityBadge score={supplier?.reliabilityScore ?? 0} />
            </div>
            {inputListing && (
              <Button asChild className="mt-4 w-full" variant="outline">
                <Link to="/inputs/$inputId" params={{ inputId: inputListing.id }}>
                  View input listing
                </Link>
              </Button>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Group summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Farmers pledged</dt>
                <dd className="font-medium text-foreground">{pledges.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Shortfall</dt>
                <dd className="font-medium text-foreground">
                  {formatQuantity(Math.max(0, groupPurchase.thresholdQuantity - pledged), unit)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd className="font-medium text-foreground">{unit}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
