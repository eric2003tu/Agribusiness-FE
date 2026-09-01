import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TransactionStatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { useWorkspace } from "@/lib/workspace-store";
import { formatQuantity, formatRwf } from "@/lib/format";
import { productById } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions/$transactionId")({
  head: () => ({ meta: [{ title: "Transaction — Agribridge" }] }),
  component: TransactionDetail,
});

function TransactionDetail() {
  const { transactionId } = Route.useParams();
  const {
    transactions,
    userById,
    currentUser,
    confirmTransaction,
    raiseDispute,
    resolveDispute,
    rateTransaction,
    ratingsForUser,
    can,
  } = useWorkspace();
  const tx = transactions.find((t) => t.id === transactionId);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  if (!tx) {
    return (
      <AppShell title="Transaction not found">
        <p className="text-sm text-muted-foreground">This transaction no longer exists.</p>
      </AppShell>
    );
  }

  const product = productById(tx.productId);
  const buyer = userById(tx.buyerId);
  const seller = userById(tx.sellerId);
  const isBuyer = currentUser.id === tx.buyerId;
  const isSeller = currentUser.id === tx.sellerId;
  const otherPartyId = isBuyer ? tx.sellerId : tx.buyerId;
  const alreadyRated = ratingsForUser(otherPartyId).some(
    (r) => r.transactionId === tx.id && r.ratedBy === currentUser.id,
  );

  return (
    <AppShell
      title={`${formatQuantity(tx.quantity, tx.unit)} ${product?.name ?? ""}`}
      description={`${buyer?.name ?? "unknown"} buying from ${seller?.name ?? "unknown"}`}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Total value {formatRwf(tx.quantity * tx.unitPrice)}
              </p>
              <TransactionStatusBadge status={tx.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Unit price</dt>
                <dd className="font-medium text-foreground">{formatRwf(tx.unitPrice)}/{tx.unit}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium text-foreground">{tx.createdAt}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Seller confirmed</dt>
                <dd className="font-medium text-foreground">{tx.confirmedBySeller ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Buyer confirmed</dt>
                <dd className="font-medium text-foreground">{tx.confirmedByBuyer ? "Yes" : "No"}</dd>
              </div>
            </dl>

            {tx.status === "disputed" && tx.disputeReason && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {tx.disputeReason}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              {isSeller && !tx.confirmedBySeller && tx.status !== "disputed" && (
                <Button size="sm" onClick={() => confirmTransaction(tx.id, "seller")}>
                  Confirm as seller
                </Button>
              )}
              {isBuyer && !tx.confirmedByBuyer && tx.status !== "disputed" && (
                <Button size="sm" onClick={() => confirmTransaction(tx.id, "buyer")}>
                  Confirm as buyer
                </Button>
              )}
              {(isBuyer || isSeller) && tx.status !== "completed" && tx.status !== "disputed" && (
                <Button size="sm" variant="outline" onClick={() => setShowDisputeForm((s) => !s)}>
                  Raise a dispute
                </Button>
              )}
              {can("moderate") && tx.status === "disputed" && (
                <Button size="sm" variant="outline" onClick={() => resolveDispute(tx.id)}>
                  Resolve dispute
                </Button>
              )}
            </div>

            {showDisputeForm && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="What went wrong?"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  disabled={!disputeReason.trim()}
                  onClick={() => {
                    raiseDispute(tx.id, disputeReason);
                    setDisputeReason("");
                    setShowDisputeForm(false);
                  }}
                >
                  Submit dispute
                </Button>
              </div>
            )}
          </section>

          {tx.status === "completed" && (isBuyer || isSeller) && !alreadyRated && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Rate this transaction</h2>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRatingScore(n)} aria-label={`${n} stars`}>
                    <Star
                      className={cn(
                        "size-6",
                        n <= ratingScore ? "fill-warning text-warning" : "text-muted-foreground",
                      )}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                className="mt-3"
                placeholder="Optional comment"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={2}
              />
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  rateTransaction(tx.id, ratingScore, ratingComment.trim() || undefined);
                  setRatingComment("");
                }}
              >
                Submit rating
              </Button>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Parties</h2>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar user={buyer} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{buyer?.name}</p>
                <p className="text-xs text-muted-foreground">Buyer</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar user={seller} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{seller?.name}</p>
                <p className="text-xs text-muted-foreground">Seller</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
