import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/user-avatar";
import { GroupPurchaseStatusBadge } from "@/components/status-badge";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { productById } from "@/lib/mock-data";

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {formatQuantity(pledged, inputListing?.unit ?? "kg")} of{" "}
                {formatQuantity(groupPurchase.thresholdQuantity, inputListing?.unit ?? "kg")} pledged
              </p>
              <GroupPurchaseStatusBadge status={groupPurchase.status} />
            </div>
            <Progress value={pct} className="mt-3" />
            {groupPurchase.supplierInvoiceTotal && (
              <p className="mt-2 text-xs text-muted-foreground">
                Invoice total {formatRwf(groupPurchase.supplierInvoiceTotal)}, split proportionally.
              </p>
            )}

            {hasRole("farmer") && groupPurchase.status === "collecting" && (
              <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="pledge">Pledge quantity ({inputListing?.unit})</Label>
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
                        Pledged {formatQuantity(p.pledgedQuantity, inputListing?.unit ?? "kg")}
                      </p>
                    </div>
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
      </div>
    </AppShell>
  );
}
