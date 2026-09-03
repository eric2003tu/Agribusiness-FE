import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditCard, Loader2, Lock, Smartphone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/mock-data";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Agribridge" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { cartLines, currentUser, placeOrder } = useWorkspace();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [phone, setPhone] = useState(currentUser.phone);
  const [cardNumber, setCardNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const orderableLines = cartLines.filter((l) => l.available);
  const total = orderableLines.reduce((s, l) => s + (l.lineTotal ?? 0), 0);
  const readyToPay =
    orderableLines.length > 0 &&
    (paymentMethod === "mobile_money" ? phone.trim().length > 0 : cardNumber.trim().length > 0);

  function pay() {
    if (!readyToPay || busy) return;
    setBusy(true);
    const ok = placeOrder(paymentMethod);
    setBusy(false);
    if (ok) void navigate({ to: "/transactions" });
  }

  if (cartLines.length === 0) {
    return (
      <AppShell title="Checkout">
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Button asChild className="mt-4">
            <Link to="/listings">Browse listings</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Checkout" description="Choose how you'd like to pay for your order.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Payment method</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("mobile_money")}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                  paymentMethod === "mobile_money"
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:bg-accent"
                }`}
              >
                <Smartphone className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Mobile Money</p>
                  <p className="text-xs text-muted-foreground">MTN / Airtel</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                  paymentMethod === "card" ? "border-primary bg-primary-soft" : "border-border hover:bg-accent"
                }`}
              >
                <CreditCard className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Card</p>
                  <p className="text-xs text-muted-foreground">Visa / Mastercard</p>
                </div>
              </button>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              {paymentMethod === "mobile_money" ? (
                <div className="grid gap-2 sm:w-72">
                  <Label htmlFor="momoPhone">Mobile Money number</Label>
                  <Input
                    id="momoPhone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+250788000000"
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="cardNumber">Card number</Label>
                    <Input
                      id="cardNumber"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cardExpiry">Expiry</Label>
                      <Input id="cardExpiry" placeholder="MM/YY" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cardCvc">CVC</Label>
                      <Input id="cardCvc" inputMode="numeric" placeholder="123" />
                    </div>
                  </div>
                </div>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" /> Payments are simulated in this demo — no real charge is made.
              </p>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Order items</h2>
            <ul className="mt-3 divide-y divide-border">
              {orderableLines.map((line) => (
                <li key={`${line.kind}-${line.listingId}`} className="flex items-center gap-3 py-3">
                  {line.photo ? (
                    <img src={line.photo} alt={line.productName} className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <ProductIllustration productId={line.productId} className="size-12 shrink-0" rounded="rounded-lg" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{line.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} {line.unit} · {line.sellerName}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatRwf(line.lineTotal ?? 0)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card sticky top-20 p-5">
            <h2 className="text-sm font-semibold text-foreground">Total</h2>
            <p className="mt-2 text-3xl font-semibold text-foreground">{formatRwf(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{orderableLines.length} item(s)</p>
            <Button className="mt-5 w-full" disabled={!readyToPay || busy} onClick={pay}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Pay {formatRwf(total)} with {PAYMENT_METHOD_LABELS[paymentMethod]}
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link to="/cart">Back to cart</Link>
            </Button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
