import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2, LogIn, Package, ShieldCheck, ShoppingBasket, Sprout, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DEMO_CREDENTIALS } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace-store";
import type { Role } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Agribridge" },
      {
        name: "description",
        content:
          "Sign in to Agribridge to list produce, post buyer requests, join aggregation groups and order farm inputs.",
      },
      { property: "og:title", content: "Sign in — Agribridge" },
      { property: "og:description", content: "Demo accounts for farmers, buyers, suppliers and admin." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LoginPage,
});

const ROLE_ICON: Record<Role, typeof Sprout> = {
  farmer: Sprout,
  buyer: ShoppingBasket,
  supplier: Package,
  transporter: Truck,
  admin: ShieldCheck,
};

function LoginPage() {
  const { signIn, session, ready } = useWorkspace();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [ready, session, navigate]);

  function submit(nextPhone = phone, nextOtp = otp) {
    setBusy(true);
    signIn(nextPhone, nextOtp);
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-bold">
            AB
          </span>
          <span className="text-sm font-semibold">Agribridge</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Connecting farmers, buyers and input suppliers across Rwanda.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            List produce, get matched into bulk aggregation groups, pool input orders with nearby
            farmers, and track every transaction from first offer to delivery.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">Demo marketplace · mock data</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in to Agribridge
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your phone number and OTP, or pick a demo account below.
            </p>
          </div>

          <form
            className="surface-card space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+250788000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="otp">OTP code</Label>
              <Input
                id="otp"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <KeyRound className="size-3.5" />
              Demo accounts
            </div>
            <ul className="mt-3 space-y-3">
              {DEMO_CREDENTIALS.map((c) => {
                const Icon = ROLE_ICON[c.role];
                return (
                  <li key={c.phone} className="surface-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{c.label}</p>
                          <Badge variant="secondary" className="capitalize">
                            {c.role}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          {c.phone} · OTP {c.otp}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPhone(c.phone);
                          setOtp(c.otp);
                          submit(c.phone, c.otp);
                        }}
                      >
                        Use
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
