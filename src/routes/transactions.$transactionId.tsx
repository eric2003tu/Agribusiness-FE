import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TransactionStatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { ProductIllustration } from "@/components/product-illustration";
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
  const ratingOfBuyer = ratingsForUser(tx.buyerId).find((r) => r.transactionId === tx.id);
  const ratingOfSeller = ratingsForUser(tx.sellerId).find((r) => r.transactionId === tx.id);

  return (
    <AppShell
      title={`${formatQuantity(tx.quantity, tx.unit)} ${product?.name ?? ""}`}
      description={`${buyer?.name ?? "unknown"} buying from ${seller?.name ?? "unknown"}`}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-start gap-5">
              <ProductIllustration productId={tx.productId} className="h-28 w-28" />
              <div className="min-w-[16rem] flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{product?.name}</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatRwf(tx.quantity * tx.unitPrice)}
                    </p>
                  </div>
                  <TransactionStatusBadge status={tx.status} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="font-medium text-foreground">{formatQuantity(tx.quantity, tx.unit)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Unit price</dt>
                    <dd className="font-medium text-foreground">
                      {formatRwf(tx.unitPrice)}/{tx.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="font-medium text-foreground">{tx.createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd className="font-medium text-foreground">{tx.completedAt ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Seller confirmed</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                      {tx.confirmedBySeller ? (
                        <CheckCircle2 className="size-4 text-success" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                      {tx.confirmedBySeller ? "Yes" : "Not yet"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Buyer confirmed</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                      {tx.confirmedByBuyer ? (
                        <CheckCircle2 className="size-4 text-success" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                      {tx.confirmedByBuyer ? "Yes" : "Not yet"}
                    </dd>
                  </div>
                </dl>
                {tx.groupId && (
                  <Button asChild className="mt-4" size="sm" variant="outline">
                    <Link to="/aggregation/$groupId" params={{ groupId: tx.groupId }}>
                      Part of aggregation group {tx.groupId}
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {tx.status === "disputed" && tx.disputeReason && (
              <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
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

          {tx.status === "completed" && (ratingOfBuyer || ratingOfSeller) && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Ratings</h2>
              <div className="mt-3 space-y-4">
                {ratingOfSeller && (
                  <div className="flex items-start gap-3">
                    <UserAvatar user={buyer} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{buyer?.name} rated the seller</p>
                      <div className="mt-1 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "size-4",
                              n <= ratingOfSeller.score ? "fill-warning text-warning" : "text-muted-foreground",
                            )}
                          />
                        ))}
                      </div>
                      {ratingOfSeller.comment && (
                        <p className="mt-1 text-sm text-muted-foreground">{ratingOfSeller.comment}</p>
                      )}
                    </div>
                  </div>
                )}
                {ratingOfBuyer && (
                  <div className="flex items-start gap-3">
                    <UserAvatar user={seller} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{seller?.name} rated the buyer</p>
                      <div className="mt-1 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "size-4",
                              n <= ratingOfBuyer.score ? "fill-warning text-warning" : "text-muted-foreground",
                            )}
                          />
                        ))}
                      </div>
                      {ratingOfBuyer.comment && (
                        <p className="mt-1 text-sm text-muted-foreground">{ratingOfBuyer.comment}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{buyer?.name}</p>
                <p className="truncate text-xs text-muted-foreground">Buyer · {buyer?.phone}</p>
              </div>
              <ReliabilityBadge score={buyer?.reliabilityScore ?? 0} />
            </div>
            <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
              <UserAvatar user={seller} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{seller?.name}</p>
                <p className="truncate text-xs text-muted-foreground">Seller · {seller?.phone}</p>
              </div>
              <ReliabilityBadge score={seller?.reliabilityScore ?? 0} />
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Transaction summary</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Transaction ID</dt>
                <dd className="font-medium text-foreground">{tx.id}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-medium text-foreground">
                  {tx.groupId ? "Bulk aggregation" : "Direct purchase"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Unit</dt>
                <dd className="font-medium text-foreground">{tx.unit}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
