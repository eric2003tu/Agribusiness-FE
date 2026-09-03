import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf } from "@/lib/format";
import type { ResolvedCartLine } from "@/lib/workspace-store";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Agribridge" }] }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { cartLines, cartTotal, updateCartQuantity, removeFromCart } = useWorkspace();

  const groups = new Map<string, ResolvedCartLine[]>();
  cartLines.forEach((line) => {
    const key = `${line.sellerId}__${line.sellerName}`;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  });

  const unavailableCount = cartLines.filter((l) => !l.available).length;
  const orderableTotal = cartLines.filter((l) => l.available).reduce((s, l) => s + (l.lineTotal ?? 0), 0);

  return (
    <AppShell title="Your cart" description="Review your items before checking out.">
      {cartLines.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingCart className="size-6" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Your cart is empty</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Browse the marketplace and add produce or farm inputs to your cart.
          </p>
          <Button asChild className="mt-2">
            <Link to="/listings">Browse produce listings</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {Array.from(groups.entries()).map(([key, lines]) => (
              <section key={key} className="surface-card p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Store className="size-4 text-muted-foreground" />
                  {lines[0]?.sellerName}
                </div>
                <ul className="mt-3 divide-y divide-border">
                  {lines.map((line) => (
                    <li key={`${line.kind}-${line.listingId}`} className="flex flex-wrap items-center gap-4 py-4">
                      {line.photo ? (
                        <img src={line.photo} alt={line.productName} className="size-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <ProductIllustration productId={line.productId} className="size-16 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{line.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.kind === "input" ? "Farm input" : "Produce"} ·{" "}
                          {line.unitPrice ? `${formatRwf(line.unitPrice)}/${line.unit}` : "Awaiting offer price"}
                        </p>
                        {!line.available && (
                          <Badge variant="destructive" className="mt-1">
                            No longer available
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8"
                          onClick={() => updateCartQuantity(line.kind, line.listingId, line.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={line.maxQuantity || undefined}
                          value={line.quantity}
                          onChange={(e) => updateCartQuantity(line.kind, line.listingId, Number(e.target.value) || 0)}
                          className="h-8 w-16 text-center"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8"
                          onClick={() => updateCartQuantity(line.kind, line.listingId, line.quantity + 1)}
                          aria-label="Increase quantity"
                          disabled={line.quantity >= line.maxQuantity}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <p className="w-28 text-right text-sm font-semibold text-foreground">
                        {line.lineTotal ? formatRwf(line.lineTotal) : "—"}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(line.kind, line.listingId)}
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="space-y-6">
            <section className="surface-card sticky top-20 p-5">
              <h2 className="text-sm font-semibold text-foreground">Order summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Items</dt>
                  <dd className="font-medium text-foreground">{cartLines.length}</dd>
                </div>
                {unavailableCount > 0 && (
                  <div className="flex items-center justify-between text-destructive">
                    <dt>Unavailable</dt>
                    <dd className="font-medium">{unavailableCount}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                  <dt className="font-medium text-foreground">Total</dt>
                  <dd className="font-semibold text-foreground">{formatRwf(orderableTotal)}</dd>
                </div>
              </dl>
              <Button
                className="mt-5 w-full"
                disabled={orderableTotal <= 0}
                onClick={() => void navigate({ to: "/checkout" })}
              >
                Proceed to checkout
              </Button>
              {cartTotal !== orderableTotal && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Unavailable items are excluded from your total — remove them to tidy up your cart.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
